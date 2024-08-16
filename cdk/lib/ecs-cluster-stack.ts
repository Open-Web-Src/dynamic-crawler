import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as applicationautoscaling from "aws-cdk-lib/aws-applicationautoscaling";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface ECSClusterStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSecurityGroup: ec2.SecurityGroup;
  reactappSecurityGroup: ec2.SecurityGroup;
  flaskappSecurityGroup: ec2.SecurityGroup;
  crawlerSecurityGroup: ec2.SecurityGroup;
  redisSecurityGroup: ec2.SecurityGroup;
  seleniumSecurityGroup: ec2.SecurityGroup;
  ecrRepos: {
    crawler: ecr.Repository;
    flaskapp: ecr.Repository;
    reactapp: ecr.Repository;
    // redisLogging: ecr.Repository;
  };
}

export class ECSClusterStack extends cdk.Stack {
  public readonly reactappService: ecs.FargateService;
  public readonly flaskappService: ecs.FargateService;
  public readonly crawlerMainService: ecs.FargateService;
  public readonly crawlerReplicaService: ecs.FargateService;
  public readonly redisService: ecs.FargateService;
  public readonly seleniumService: ecs.FargateService;
  public readonly redisLoggingService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ECSClusterStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "MyEcsCluster", {
      vpc: props.vpc,
    });

    // Create a Cloud Map namespace for service discovery
    const namespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "Namespace",
      {
        name: "app.local",
        vpc: props.vpc,
      }
    );

    // IAM Role for ECS Tasks
    const taskRole = new iam.Role(this, "MyECSTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
      ],
    });

    // Create secrets from AWS Secrets Manager
    const appSecret = secretsmanager.Secret.fromSecretAttributes(
      this,
      "MyAppSecretId",
      {
        secretCompleteArn: process.env.MY_APP_SECRET_ARN,
      }
    );
    appSecret.grantRead(taskRole);

    // React App Service
    const reactappTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MyReactAppTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    reactappTaskDefinition.addContainer(process.env.REACTAPP_CONTAINER_NAME!, {
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepos.reactapp),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "reactapp" }),
      portMappings: [{ containerPort: 80 }],
    });
    this.reactappService = new ecs.FargateService(this, "MyReactAppService", {
      cluster: cluster,
      taskDefinition: reactappTaskDefinition,
      desiredCount: 1,
      securityGroups: [props.reactappSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: "reactapp",
        cloudMapNamespace: namespace,
      },
    });

    // Flask App Service
    const flaskappTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MyFlaskAppTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    flaskappTaskDefinition.addContainer(process.env.FLASKAPP_CONTAINER_NAME!, {
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepos.flaskapp),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "flaskapp" }),
      portMappings: [{ containerPort: 5001 }],
      environment: {
        DATABASE: "crawlingdb",
        COLLECTION: "properties",
        BATCH_SIZE: "100",
      },
      secrets: {
        USERNAME: ecs.Secret.fromSecretsManager(appSecret, "USERNAME"),
        PASSWORD: ecs.Secret.fromSecretsManager(appSecret, "PASSWORD"),
        MONGO_URI: ecs.Secret.fromSecretsManager(appSecret, "MONGO_URI"),
      },
    });
    this.flaskappService = new ecs.FargateService(this, "MyFlaskAppService", {
      cluster: cluster,
      taskDefinition: flaskappTaskDefinition,
      desiredCount: 1,
      securityGroups: [props.flaskappSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: "flaskapp",
        cloudMapNamespace: namespace,
      },
    });

    // Redis Service
    const redisTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MyRedisTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    redisTaskDefinition.addContainer(process.env.REDIS_CONTAINER_NAME!, {
      image: ecs.ContainerImage.fromRegistry("redis:latest"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "redis" }),
    });
    this.redisService = new ecs.FargateService(this, "MyRedisService", {
      cluster: cluster,
      taskDefinition: redisTaskDefinition,
      desiredCount: 1,
      securityGroups: [props.redisSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: "redis",
        cloudMapNamespace: namespace,
      },
    });

    // Selenium Service
    const seleniumTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MySeleniumTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    seleniumTaskDefinition.addContainer(process.env.SELENIUM_CONTAINER_NAME!, {
      image: ecs.ContainerImage.fromRegistry(
        "selenium/standalone-firefox:latest"
      ),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "selenium" }),
    });
    this.seleniumService = new ecs.FargateService(this, "MySeleniumService", {
      cluster: cluster,
      taskDefinition: seleniumTaskDefinition,
      desiredCount: 1,
      securityGroups: [props.seleniumSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: "selenium",
        cloudMapNamespace: namespace,
      },
    });

    // Crawler Main Service
    const crawlerMainTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MyCrawlerMainTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    crawlerMainTaskDefinition.addContainer(
      process.env.CRAWLER_MAIN_CONTAINER_NAME!,
      {
        image: ecs.ContainerImage.fromEcrRepository(props.ecrRepos.crawler),
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: "crawler-main" }),
        environment: {
          // Flask App
          FLASKAPP_URL: "http://flaskapp.app.local:5001/api",
          FLASKAPP_DEFAULT_TIMEOUT: "1800",
          // Celery scheduler
          CELERY_BROKER_URL: "redis://redis.app.local:6379/0",
          CELERY_RESULT_BACKEND: "redis://redis.app.local:6379/0",
          // Mongo
          DATABASE: "crawlingdb",
          COLLECTION: "properties",
          BATCH_SIZE: "100",
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
          "10",
        ],
      }
    );
    this.crawlerMainService = new ecs.FargateService(
      this,
      "MyCrawlerMainService",
      {
        cluster: cluster,
        taskDefinition: crawlerMainTaskDefinition,
        desiredCount: 1,
        securityGroups: [props.crawlerSecurityGroup],
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        cloudMapOptions: {
          name: "crawler-main",
          cloudMapNamespace: namespace,
        },
      }
    );

    // Crawler Replica Service
    const crawlerReplicaTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MyCrawlerReplicaTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskRole,
        taskRole: taskRole,
      }
    );
    crawlerReplicaTaskDefinition.addContainer(
      process.env.CRAWLER_REPLICA_CONTAINER_NAME!,
      {
        image: ecs.ContainerImage.fromEcrRepository(props.ecrRepos.crawler),
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: "crawler-replica" }),
        environment: {
          // Flask App
          FLASKAPP_URL: "http://flaskapp.app.local:5001/api",
          FLASKAPP_DEFAULT_TIMEOUT: "1800",
          // Celery scheduler
          CELERY_BROKER_URL: "redis://redis.app.local:6379/0",
          CELERY_RESULT_BACKEND: "redis://redis.app.local:6379/0",
          // Mongo
          DATABASE: "crawlingdb",
          COLLECTION: "properties",
          BATCH_SIZE: "100",
        },
        secrets: {
          USERNAME: ecs.Secret.fromSecretsManager(appSecret, "USERNAME"),
          PASSWORD: ecs.Secret.fromSecretsManager(appSecret, "PASSWORD"),
          MONGO_URI: ecs.Secret.fromSecretsManager(appSecret, "MONGO_URI"),
        },
        command: [
          "celery",
          "-A",
          "scheduler.app_replicas",
          "worker",
          "-l",
          "INFO",
          "-c",
          "10",
        ],
      }
    );
    this.crawlerReplicaService = new ecs.FargateService(
      this,
      "MyCrawlerReplicaService",
      {
        cluster: cluster,
        taskDefinition: crawlerReplicaTaskDefinition,
        desiredCount: 1,
        securityGroups: [props.crawlerSecurityGroup],
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        cloudMapOptions: {
          name: "crawler-replica",
          cloudMapNamespace: namespace,
        },
      }
    );

    // Redis Logging Service
    // const redisLoggingTaskDefinition = new ecs.FargateTaskDefinition(
    //   this,
    //   "MyRedisLoggingTaskDef",
    //   {
    //     memoryLimitMiB: 512,
    //     cpu: 256,
    //     executionRole: taskRole,
    //     taskRole: taskRole,
    //   }
    // );
    // redisLoggingTaskDefinition.addContainer(
    //   process.env.REDIS_LOGGING_CONTAINER_NAME!,
    //   {
    //     image: ecs.ContainerImage.fromRegistry(props.ecrRepos.redisLogging),
    //     logging: ecs.LogDrivers.awsLogs({ streamPrefix: "redis-logging" }),
    //     environment: {
    //       REDIS_HOST: "redis.app.local",
    //       REDIS_PORT: "6379",
    //       REDIS_QUEUE_NAME: "celery",
    //       ENV: "pro", // Set to 'pro' for production
    //       AWS_REGION=process.env.AWS_DEFAULT_REGION
    //       CLOUDWATCH_NAMESPACE=Custom/Celery
    //       CLOUDWATCH_METRIC_NAME=QueueLength
    //       CLOUDWATCH_DIMENSIONS_0=QueueName
    //     },
    //   }
    // );
    // this.redisLoggingService = new ecs.FargateService(
    //   this,
    //   "MyRedisLoggingService",
    //   {
    //     cluster: cluster,
    //     taskDefinition: redisLoggingTaskDefinition,
    //     desiredCount: 1,
    //     securityGroups: [props.redisSecurityGroup],
    //     vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    //     cloudMapOptions: {
    //       name: "redis-logging",
    //       cloudMapNamespace: namespace,
    //     },
    //   }
    // );

    // Scale on CloudWatch Metrics
    // this.scaleOnCloudwatchMetric();

    // CloudWatch Alarms
    this.createCloudwatchAlarms();
  }

  private scaleOnCloudwatchMetric() {
    // Set up auto-scaling for crawler replicas based on CloudWatch metrics
    const scaling = this.crawlerReplicaService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 100, // Adjust based on your requirements
    });

    const queueLengthMetric = new cloudwatch.Metric({
      namespace: process.env.CLOUDWATCH_NAMESPACE!,
      metricName: process.env.CLOUDWATCH_METRIC_NAME!,
      dimensionsMap: {
        [process.env.CLOUDWATCH_DIMENSIONS_0!]: process.env.REDIS_QUEUE_NAME!,
      },
      period: cdk.Duration.seconds(5),
    });

    scaling.scaleOnMetric("QueueLengthScaling", {
      metric: queueLengthMetric,
      adjustmentType: applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      scalingSteps: [
        { upper: 0, change: -1 }, // Scale down if no tasks in the queue
        { lower: 1, change: +1 }, // Scale up as tasks appear in the queue
        { lower: 10, change: +2 }, // Scale up more aggressively if queue grows larger
      ],
      evaluationPeriods: 1,
    });
  }

  private createCloudwatchAlarms() {
    // Create CloudWatch Alarms for the services
    this.createAlarm(this.reactappService, "reactapp");
    this.createAlarm(this.flaskappService, "flaskapp");
    this.createAlarm(this.crawlerMainService, "crawler-main");
    this.createAlarm(this.crawlerReplicaService, "crawler-replica");
  }

  private createAlarm(service: ecs.FargateService, serviceName: string) {
    new cloudwatch.Alarm(this, `${serviceName}CpuAlarm`, {
      metric: service.metricCpuUtilization(),
      threshold: 80,
      evaluationPeriods: 1,
      alarmDescription: `Alarm if ${serviceName} CPU utilization exceeds 80%`,
      alarmName: `${serviceName}-cpu-utilization-alarm`,
    });

    new cloudwatch.Alarm(this, `${serviceName}MemoryAlarm`, {
      metric: service.metricMemoryUtilization(),
      threshold: 80,
      evaluationPeriods: 1,
      alarmDescription: `Alarm if ${serviceName} memory utilization exceeds 80%`,
      alarmName: `${serviceName}-memory-utilization-alarm`,
    });
  }
}
