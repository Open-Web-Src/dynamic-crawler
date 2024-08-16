import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface PipelineStackProps extends cdk.StackProps {
  services: {
    crawlerMain: ecs.FargateService;
    crawlerReplica: ecs.FargateService;
    flaskapp: ecs.FargateService;
    reactapp: ecs.FargateService;
    selenium: ecs.FargateService;
    redis: ecs.FargateService;
    // redisLogging: ecs.FargateService;
  };
  sourceBucketName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceBucket = s3.Bucket.fromBucketName(
      this,
      "MySourceBucket",
      props.sourceBucketName
    );

    const buildProject = new codebuild.PipelineProject(this, "MyBuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        environmentVariables: {
          GITLAB_USERNAME: { value: process.env.GITLAB_USERNAME },
          GITLAB_TOKEN: { value: process.env.GITLAB_TOKEN },
          BRANCH: { value: process.env.BRANCH },
          AWS_DEFAULT_REGION: { value: process.env.AWS_DEFAULT_REGION },
          ACCOUNT_ID: { value: process.env.ACCOUNT_ID },
          DOCKERHUB_USERNAME: { value: process.env.DOCKERHUB_USERNAME },
          DOCKERHUB_PASSWORD: { value: process.env.DOCKERHUB_PASSWORD },
          CRAWLER_MAIN_CONTAINER_NAME: {
            value: process.env.CRAWLER_MAIN_CONTAINER_NAME,
          },
          CRAWLER_REPLICA_CONTAINER_NAME: {
            value: process.env.CRAWLER_REPLICA_CONTAINER_NAME,
          },
          FLASKAPP_CONTAINER_NAME: {
            value: process.env.FLASKAPP_CONTAINER_NAME,
          },
          REACTAPP_CONTAINER_NAME: {
            value: process.env.REACTAPP_CONTAINER_NAME,
          },
          SELENIUM_CONTAINER_NAME: {
            value: process.env.SELENIUM_CONTAINER_NAME,
          },
          REDIS_CONTAINER_NAME: { value: process.env.REDIS_CONTAINER_NAME },
          // REDIS_LOGGING_CONTAINER_NAME: { value: process.env.REDIS_LOGGING_CONTAINER_NAME },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
    });

    // Attach policies to the build project role
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: [sourceBucket.bucketArn, `${sourceBucket.bucketArn}/*`],
      })
    );

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: ["*"],
      })
    );

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );

    // Attach policies to the pipeline role
    const pipelineRole = new iam.Role(this, "MyPipelineRole", {
      assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
    });

    pipelineRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [sourceBucket.bucketArn, `${sourceBucket.bucketArn}/*`],
      })
    );

    pipelineRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:UpdateService",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      })
    );

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "MyPipeline",
      role: pipelineRole,
      stages: [
        {
          stageName: "Source",
          actions: [
            new codepipelineActions.S3SourceAction({
              actionName: "Source",
              bucket: sourceBucket,
              bucketKey: "buildspec.zip", // Ensure this file exists in your S3 bucket
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new codepipelineActions.CodeBuildAction({
              actionName: "Build",
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: "DeployDependencies",
          actions: [
            new codepipelineActions.EcsDeployAction({
              actionName: "RedisDeploy",
              service: props.services.redis,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_redis.json"
              ),
            }),
            new codepipelineActions.EcsDeployAction({
              actionName: "SeleniumDeploy",
              service: props.services.selenium,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_selenium.json"
              ),
            }),
          ],
        },
        {
          stageName: "DeployWorker",
          actions: [
            new codepipelineActions.EcsDeployAction({
              actionName: "CrawlerMainDeploy",
              service: props.services.crawlerMain,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_crawler_main.json"
              ),
            }),
            new codepipelineActions.EcsDeployAction({
              actionName: "CrawlerReplicaDeploy",
              service: props.services.crawlerReplica,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_crawler_replica.json"
              ),
            }),
          ],
        },
        // {
        //   stageName: "DeployMonitoring",
        //   actions: [
        //     new codepipelineActions.EcsDeployAction({
        //       actionName: "RedisLoggingDeploy",
        //       service: props.services.redisLogging,
        //       imageFile: new codepipeline.ArtifactPath(
        //         buildOutput,
        //         "imagedefinitions_redis_logging.json"
        //       ),
        //     }),
        //   ],
        // },
        {
          stageName: "DeployBackend",
          actions: [
            new codepipelineActions.EcsDeployAction({
              actionName: "FlaskAppDeploy",
              service: props.services.flaskapp,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_flaskapp.json"
              ),
            }),
          ],
        },
        {
          stageName: "DeployFrontend",
          actions: [
            new codepipelineActions.EcsDeployAction({
              actionName: "ReactAppDeploy",
              service: props.services.reactapp,
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                "imagedefinitions_reactapp.json"
              ),
            }),
          ],
        },
      ],
    });
  }
}
