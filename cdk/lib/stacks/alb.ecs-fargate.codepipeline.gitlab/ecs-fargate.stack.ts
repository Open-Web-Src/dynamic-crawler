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
  crawlerSecurityGroup: SecurityGroupConstruct;
  redisSecurityGroup: SecurityGroupConstruct;
  seleniumSecurityGroup: SecurityGroupConstruct;
  crawlerRepo: ecr.IRepository;
  flaskappRepo: ecr.IRepository;
  reactappRepo: ecr.IRepository;
  redisLoggingRepo: ecr.IRepository;
}

export class EcsFargateClusterStack extends cdk.Stack {
  public readonly reactappService: EcsFargateConstruct;
  public readonly flaskappService: EcsFargateConstruct;
  public readonly crawlerMainService: EcsFargateConstruct;
  public readonly crawlerReplicaService: EcsFargateConstruct;
  public readonly redisService: EcsFargateConstruct;
  public readonly seleniumService: EcsFargateConstruct;
  public readonly redisLoggingService: EcsFargateConstruct;

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
    });

    // REDIS
    this.redisService = new EcsFargateConstruct(this, "RedisService", {
      cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: props.redisSecurityGroup.securityGroup,
      repository: "redis:latest",
      taskRole: taskRole.role,
      containerName: process.env.REDIS_CONTAINER_NAME!,
      portMappings: [{ containerPort: 6379 }],
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      serviceDiscoveryNamespace: namespace,
      serviceName: "redis",
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // SELENIUM
    this.seleniumService = new EcsFargateConstruct(this, "SeleniumService", {
      cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: props.seleniumSecurityGroup.securityGroup,
      repository: "selenium/standalone-firefox:latest",
      taskRole: taskRole.role,
      containerName: process.env.SELENIUM_CONTAINER_NAME!,
      portMappings: [{ containerPort: 4444 }],
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      serviceDiscoveryNamespace: namespace,
      serviceName: "selenium",
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // CRAWLER_MAIN
    this.crawlerMainService = new EcsFargateConstruct(
      this,
      "CrawlerMainService",
      {
        cluster,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroup: props.crawlerSecurityGroup.securityGroup,
        repository: props.crawlerRepo,
        taskRole: taskRole.role,
        containerName: process.env.CRAWLER_MAIN_CONTAINER_NAME!,
        portMappings: [{ containerPort: 5002 }],
        cpu: 256,
        memoryLimitMiB: 512,
        environment: {
          FLASKAPP_URL: process.env.FLASKAPP_URL!,
          FLASKAPP_DEFAULT_TIMEOUT: process.env.FLASKAPP_DEFAULT_TIMEOUT!,
          CELERY_BROKER_URL: process.env.REDIS_URL!,
          CELERY_RESULT_BACKEND: process.env.REDIS_URL!,
          DATABASE: process.env.DATABASE!,
          COLLECTION: process.env.COLLECTION!,
          BATCH_SIZE: process.env.BATCH_SIZE!,
        },
        secrets: {
          USERNAME: ecs.Secret.fromSecretsManager(appSecret, "USERNAME"),
          PASSWORD: ecs.Secret.fromSecretsManager(appSecret, "PASSWORD"),
          MONGO_URI: ecs.Secret.fromSecretsManager(appSecret, "MONGO_URI"),
        },
        command: [
          "celery",
          "-A",
          "scheduler.app",
          "worker",
          "-B",
          "-l",
          "INFO",
          "-c",
          "2",
        ],
        desiredCount: 1,
        serviceDiscoveryNamespace: namespace,
        serviceName: "crawler-main",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // CRAWLER_REPLICA
    this.crawlerReplicaService = new EcsFargateConstruct(
      this,
      "CrawlerReplicaService",
      {
        cluster,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroup: props.crawlerSecurityGroup.securityGroup,
        repository: props.crawlerRepo,
        taskRole: taskRole.role,
        containerName: process.env.CRAWLER_MAIN_CONTAINER_NAME!,
        portMappings: [{ containerPort: 5003 }],
        cpu: 256,
        memoryLimitMiB: 512,
        environment: {
          FLASKAPP_URL: process.env.FLASKAPP_URL!,
          FLASKAPP_DEFAULT_TIMEOUT: process.env.FLASKAPP_DEFAULT_TIMEOUT!,
          CELERY_BROKER_URL: process.env.REDIS_URL!,
          CELERY_RESULT_BACKEND: process.env.REDIS_URL!,
          DATABASE: process.env.DATABASE!,
          COLLECTION: process.env.COLLECTION!,
          BATCH_SIZE: process.env.BATCH_SIZE!,
        },
        secrets: {
          USERNAME: ecs.Secret.fromSecretsManager(appSecret, "USERNAME"),
          PASSWORD: ecs.Secret.fromSecretsManager(appSecret, "PASSWORD"),
          MONGO_URI: ecs.Secret.fromSecretsManager(appSecret, "MONGO_URI"),
        },
        command: [
          "celery",
          "-A",
          "scheduler.app",
          "worker",
          "-l",
          "INFO",
          "-c",
          "2",
        ],
        desiredCount: 1,
        serviceDiscoveryNamespace: namespace,
        serviceName: "crawler-replica",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // REDIS_LOGGING
    this.redisLoggingService = new EcsFargateConstruct(
      this,
      "RedisLoggingService",
      {
        cluster,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroup: props.crawlerSecurityGroup.securityGroup,
        repository: props.redisLoggingRepo,
        taskRole: taskRole.role,
        containerName: process.env.REDIS_LOGGING_CONTAINER_NAME!,
        cpu: 256,
        memoryLimitMiB: 512,
        environment: {
          ENV: "pro",
          REDIS_HOST: process.env.REDIS_HOST!,
          REDIS_PORT: process.env.REDIS_PORT!,
          REDIS_QUEUE_NAME: process.env.REDIS_QUEUE_NAME!,
          AWS_REGION: process.env.AWS_DEFAULT_REGION!,
          CLOUDWATCH_NAMESPACE: process.env.CLOUDWATCH_NAMESPACE!,
          CLOUDWATCH_METRIC_NAME: process.env.CLOUDWATCH_METRIC_NAME!,
          CLOUDWATCH_DIMENSIONS_0: process.env.CLOUDWATCH_DIMENSIONS_0!,
        },
        desiredCount: 1,
        serviceDiscoveryNamespace: namespace,
        serviceName: "redis-logging",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );
  }
}
