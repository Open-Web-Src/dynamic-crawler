import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as applicationautoscaling from "aws-cdk-lib/aws-applicationautoscaling";
import { aws_logs as logs } from "aws-cdk-lib";

interface MetricScalingOption {
  namespace: string;
  metricName: string;
  dimensionsMap?: { [key: string]: string };
  period?: cdk.Duration;
  statistic?: string;
  adjustmentType?: applicationautoscaling.AdjustmentType;
  scalingSteps?: applicationautoscaling.ScalingInterval[];
  evaluationPeriods?: number;
}

interface ScalingOptions {
  minCapacity?: number;
  maxCapacity?: number;
  metrics?: MetricScalingOption[]; // Array of metrics for scaling
}

interface EcsFargateConstructProps {
  cluster: ecs.Cluster;
  vpcSubnets: ec2.SubnetSelection;
  securityGroup: ec2.SecurityGroup;
  repository: ecr.IRepository | string;
  taskRole: iam.Role;
  containerName: string;
  portMappings?: ecs.PortMapping[];
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
  additionalContainers?: {
    containerName: string;
    repository: ecr.IRepository | string;
    portMappings?: ecs.PortMapping[];
    environment?: { [key: string]: string };
    secrets?: { [key: string]: ecs.Secret };
    command?: string[];
    logRetention?: logs.RetentionDays;
  }[];
  xrayEnabled?: boolean;
  scalingOptions?: ScalingOptions;
}

export class EcsFargateConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: EcsFargateConstructProps) {
    super(scope, id);

    // Update taskRole if X-Ray is enabled
    if (props.xrayEnabled) {
      // Add AWSXRayDaemonWriteAccess policy to the taskRole
      props.taskRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess")
      );
    }

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

    // Add additional containers if provided
    if (props.additionalContainers) {
      for (const containerProps of props.additionalContainers) {
        const additionalContainerImage =
          typeof containerProps.repository === "string"
            ? ecs.ContainerImage.fromRegistry(containerProps.repository)
            : ecs.ContainerImage.fromEcrRepository(containerProps.repository);

        taskDefinition.addContainer(containerProps.containerName, {
          image: additionalContainerImage,
          logging: ecs.LogDrivers.awsLogs({
            streamPrefix: containerProps.containerName,
            logRetention: props.logRetention ?? logs.RetentionDays.ONE_DAY,
          }),
          portMappings: containerProps.portMappings,
          environment: containerProps.environment,
          secrets: containerProps.secrets,
          command: containerProps.command,
        });
      }
    }

    // Integrate the X-Ray daemon
    if (props.xrayEnabled) {
      taskDefinition.addContainer("XRayDaemon", {
        image: ecs.ContainerImage.fromRegistry("amazon/aws-xray-daemon"),
        environment: {
          AWS_XRAY_DAEMON_ADDRESS: "0.0.0.0:2000",
          AWS_XRAY_TRACING_NAME: props.serviceName!,
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: `${props.serviceName}-xray`,
          logRetention: props.logRetention ?? logs.RetentionDays.ONE_DAY,
        }),
        essential: true,
        portMappings: [
          {
            containerPort: 2000,
            protocol: ecs.Protocol.UDP,
          },
        ],
        command: ["-o"], // Use the local mode flag in Fargate
      });
    }

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

    // Apply scaling options if provided
    if (props.scalingOptions) {
      this.applyScaling(props.scalingOptions);
    }
  }

  private applyScaling(options: ScalingOptions) {
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: options.minCapacity ?? 1,
      maxCapacity: options.maxCapacity ?? 10,
    });

    if (options.metrics) {
      for (const metricOption of options.metrics) {
        const metric = new cloudwatch.Metric({
          namespace: metricOption.namespace,
          metricName: metricOption.metricName,
          dimensionsMap: metricOption.dimensionsMap,
          period: metricOption.period ?? cdk.Duration.minutes(1),
          statistic: metricOption.statistic ?? cloudwatch.Stats.AVERAGE,
        });

        scaling.scaleOnMetric(`ScalingFor${metricOption.metricName}`, {
          metric,
          adjustmentType:
            metricOption.adjustmentType ??
            applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
          scalingSteps: metricOption.scalingSteps ?? [
            { upper: 0, change: -1 },
            { lower: 1, change: +1 },
            { lower: 10, change: +2 },
          ],
          evaluationPeriods: metricOption.evaluationPeriods ?? 1,
        });
      }
    }
  }
}
