import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { aws_logs as logs } from "aws-cdk-lib";
import {
  EcsFargateConstruct,
  SecurityGroupConstruct,
  IamRoleConstruct,
} from "@constructs";

interface EcsClusterStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  reactappSecurityGroup: SecurityGroupConstruct;
  flaskappSecurityGroup: SecurityGroupConstruct;
  flaskappRepo: ecr.IRepository;
  reactappRepo: ecr.IRepository;
}

export class EcsFargateClusterStack extends cdk.Stack {
  public readonly reactappService: EcsFargateConstruct;
  public readonly flaskappService: EcsFargateConstruct;

  constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    const cluster = new cdk.aws_ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
    });

    const namespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "Namespace",
      {
        name: "app.local",
        vpc: props.vpc,
      }
    );

    const taskRole = new IamRoleConstruct(this, "TaskRole", {
      assumedBy: new cdk.aws_iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        "service-role/AmazonECSTaskExecutionRolePolicy",
        "AmazonEC2ContainerRegistryReadOnly",
        "CloudWatchAgentServerPolicy",
      ],
    });

    // SECRET_MANAGER
    const appSecret = secretsmanager.Secret.fromSecretAttributes(
      this,
      "AppSecret",
      {
        secretCompleteArn: process.env.MY_APP_SECRET_ARN!,
      }
    );
    appSecret.grantRead(taskRole.role);

    // REACT_APP
    this.reactappService = new EcsFargateConstruct(this, "ReactAppService", {
      cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: props.reactappSecurityGroup.securityGroup,
      repository: props.reactappRepo,
      taskRole: taskRole.role,
      containerName: process.env.REACTAPP_CONTAINER_NAME!,
      portMappings: [{ containerPort: 80 }],
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      serviceDiscoveryNamespace: namespace,
      serviceName: "reactapp",
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // FLASK_APP
    this.flaskappService = new EcsFargateConstruct(this, "FlaskAppService", {
      cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: props.flaskappSecurityGroup.securityGroup,
      repository: props.flaskappRepo,
      taskRole: taskRole.role,
      containerName: process.env.FLASKAPP_CONTAINER_NAME!,
      portMappings: [{ containerPort: 5001 }],
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
        DATABASE: process.env.DATABASE!,
        COLLECTION: process.env.COLLECTION!,
        BATCH_SIZE: process.env.BATCH_SIZE!,
        AWS_XRAY_DAEMON_ADDRESS: process.env.AWS_XRAY_DAEMON_ADDRESS!,
        AWS_XRAY_TRACING_NAME: process.env.AWS_XRAY_TRACING_NAME_FLASKAPP!,
      },
      secrets: {
        USERNAME: ecs.Secret.fromSecretsManager(appSecret, "USERNAME"),
        PASSWORD: ecs.Secret.fromSecretsManager(appSecret, "PASSWORD"),
        MONGO_URI: ecs.Secret.fromSecretsManager(appSecret, "MONGO_URI"),
      },
      desiredCount: 1,
      serviceDiscoveryNamespace: namespace,
      serviceName: "flaskapp",
      logRetention: logs.RetentionDays.ONE_WEEK,
      xrayEnabled: true,
    });
  }
}
