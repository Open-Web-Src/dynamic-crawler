import { Construct } from "constructs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { IamRoleConstruct } from "@constructs";

interface PipelineSourceConfig {
  type: "S3" | "GitHub" | "GitLab";
  s3BucketName?: string;
  gitRepo?: string;
  gitBranch?: string;
  gitOwner?: string;
  gitConnectionArn?: string;
}

interface PipelineConstructProps {
  services: { [key: string]: ecs.FargateService };
  sourceConfig: PipelineSourceConfig;
  environmentVariables: { [key: string]: string };
}

export class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);

    const pipelineRole = new IamRoleConstruct(this, "PipelineRole", {
      assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
      managedPolicies: [
        "AmazonEC2ContainerRegistryPowerUser",
        "AmazonECS_FullAccess",
        "CloudWatchFullAccess",
        "AmazonS3FullAccess",
      ],
    });

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    let sourceAction: codepipeline.IAction;
    if (props.sourceConfig.type === "S3") {
      const sourceBucket = s3.Bucket.fromBucketName(
        this,
        "SourceBucket",
        props.sourceConfig.s3BucketName!
      );
      sourceAction = new codepipelineActions.S3SourceAction({
        actionName: "Source",
        bucket: sourceBucket,
        bucketKey: "buildspec.zip",
        output: sourceOutput,
      });
    } else if (
      props.sourceConfig.type === "GitHub" ||
      props.sourceConfig.type === "GitLab"
    ) {
      sourceAction = new codepipelineActions.CodeStarConnectionsSourceAction({
        actionName: "Source",
        connectionArn: props.sourceConfig.gitConnectionArn!,
        output: sourceOutput,
        owner: props.sourceConfig.gitOwner!, // GitHub/GitLab owner
        repo: props.sourceConfig.gitRepo!,
        branch: props.sourceConfig.gitBranch!,
      });
    } else {
      throw new Error("Unsupported source type");
    }

    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        environmentVariables: Object.entries(props.environmentVariables).reduce(
          (acc, [key, value]) => {
            acc[key] = { value };
            return acc;
          },
          {} as { [key: string]: codebuild.BuildEnvironmentVariable }
        ),
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
    });

    // Attach policies to the build project's role
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
          "ssm:GetParameter",
        ],
        resources: ["*"],
      })
    );

    // Define the pipeline
    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "MyPipeline",
      role: pipelineRole.role,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
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
          stageName: "Deploy",
          actions: Object.keys(props.services).map((serviceName) => {
            return new codepipelineActions.EcsDeployAction({
              actionName: `${serviceName}Deploy`,
              service: props.services[serviceName],
              imageFile: new codepipeline.ArtifactPath(
                buildOutput,
                `imagedefinitions_${serviceName}.json`
              ),
            });
          }),
        },
      ],
    });
  }
}
