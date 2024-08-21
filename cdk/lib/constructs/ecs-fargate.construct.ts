import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import { aws_logs as logs } from "aws-cdk-lib";

interface EcsFargateConstructProps {
  cluster: ecs.Cluster;
  vpcSubnets: ec2.SubnetSelection;
  securityGroup: ec2.SecurityGroup;
  repository: ecr.Repository | string;
  taskRole: iam.Role;
  containerName: string;
  portMappings: ecs.PortMapping[];
  cpu?: number;
  memoryLimitMiB?: number;
  executionRole?: iam.Role;
  environment?: { [key: string]: string };
  secrets?: { [key: string]: ecs.Secret };
  desiredCount?: number;
  serviceDiscoveryNamespace?: servicediscovery.IPrivateDnsNamespace;
  serviceName?: string;
  command?: string[];
  logRetention?: logs.RetentionDays;
}

export class EcsFargateConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsFargateConstructProps) {
    super(scope, id);

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: props.memoryLimitMiB ?? 512,
      cpu: props.cpu ?? 256,
      executionRole: props.executionRole ?? props.taskRole,
      taskRole: props.taskRole,
    });

    // Determine the container image based on the type of repository provided
    const containerImage =
      typeof props.repository === "string"
        ? ecs.ContainerImage.fromRegistry(props.repository)
        : ecs.ContainerImage.fromEcrRepository(props.repository);

    taskDefinition.addContainer(props.containerName, {
      image: containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: props.containerName,
        logRetention: props.logRetention ?? logs.RetentionDays.ONE_DAY,
      }),
      portMappings: props.portMappings,
      environment: props.environment,
      secrets: props.secrets,
      command: props.command,
    });

    this.service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition: taskDefinition,
      desiredCount: props.desiredCount ?? 1,
      securityGroups: [props.securityGroup],
      vpcSubnets: props.vpcSubnets,
      cloudMapOptions: props.serviceDiscoveryNamespace
        ? {
            name: props.serviceName,
            cloudMapNamespace: props.serviceDiscoveryNamespace,
          }
        : undefined,
    });
  }
}
