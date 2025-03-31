import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as s3 from "aws-cdk-lib/aws-s3";

export enum LambdaCodeType {
  INLINE = "inline",
  ASSET = "asset",
  BUCKET = "bucket",
  DOCKER_IMAGE = "dockerImage",
  ECR_IMAGE = "ecrImage",
}

interface LambdaConstructProps {
  codeType: LambdaCodeType; // Type of code source
  inlineCode?: string; // Inline code content
  assetPath?: string; // Local asset path for 'asset' type
  dockerfilePath?: string; // Path to the Dockerfile directory for 'dockerImage' type
  bucketName?: string; // S3 bucket name for 'bucket' type
  bucketKey?: string; // S3 key (path) for the code zip file
  ecrRepoName?: string; // ECR repository name for 'ecrImage' type
  runtime?: lambda.Runtime; // Required for inline, asset, and bucket types
  handler?: string; // Required for inline, asset, and bucket types
  environment?: { [key: string]: string }; // Optional environment variables
  rolePolicyStatements?: iam.PolicyStatement[]; // Optional IAM role policy statements
}

export class LambdaConstruct extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    let code: lambda.Code | lambda.DockerImageCode;

    switch (props.codeType) {
      case LambdaCodeType.INLINE:
        if (!props.inlineCode) {
          throw new Error("Inline code content must be provided.");
        }
        code = lambda.Code.fromInline(props.inlineCode);
        break;

      case LambdaCodeType.ASSET:
        if (!props.assetPath) {
          throw new Error("Asset path must be provided.");
        }
        code = lambda.Code.fromAsset(props.assetPath);
        break;

      case LambdaCodeType.BUCKET:
        if (!props.bucketName || !props.bucketKey) {
          throw new Error("S3 bucket name and key must be provided.");
        }
        const bucket = s3.Bucket.fromBucketName(
          this,
          "Bucket",
          props.bucketName
        );
        code = lambda.Code.fromBucket(bucket, props.bucketKey);

        // Add S3 read permissions
        this.addS3ReadPolicy(props.bucketName, props.bucketKey);
        break;

      case LambdaCodeType.DOCKER_IMAGE:
        if (!props.dockerfilePath) {
          throw new Error("Docker image path must be provided.");
        }
        code = lambda.DockerImageCode.fromImageAsset(props.dockerfilePath);

        // Add ECR pull permissions (if the image is pushed to ECR)
        this.addEcrPullPolicy();
        break;

      case LambdaCodeType.ECR_IMAGE:
        if (!props.ecrRepoName) {
          throw new Error("ECR repository name must be provided.");
        }
        const repository = ecr.Repository.fromRepositoryName(
          this,
          "EcrRepo",
          props.ecrRepoName
        );
        code = lambda.DockerImageCode.fromEcr(repository);

        // Add ECR pull permissions
        this.addEcrPullPolicy();
        break;

      default:
        throw new Error("Unsupported code type.");
    }

    // Initialize the Lambda function based on the code type
    if (
      props.codeType === LambdaCodeType.DOCKER_IMAGE ||
      props.codeType === LambdaCodeType.ECR_IMAGE
    ) {
      this.function = new lambda.DockerImageFunction(this, "LambdaFunction", {
        code: code as lambda.DockerImageCode,
        environment: props.environment,
      });
    } else {
      this.function = new lambda.Function(this, "LambdaFunction", {
        runtime: props.runtime || lambda.Runtime.NODEJS_16_X,
        handler: props.handler || "index.handler",
        code: code as lambda.Code,
        environment: props.environment,
      });
    }

    // Adding role policy statements if provided
    if (props.rolePolicyStatements) {
      for (const statement of props.rolePolicyStatements) {
        this.function.addToRolePolicy(statement);
      }
    }
  }

  private addS3ReadPolicy(bucketName: string, bucketKey: string) {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [`arn:aws:s3:::${bucketName}/${bucketKey}`],
      })
    );
  }

  private addEcrPullPolicy() {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
        resources: ["*"], // Use specific ARNs in production
      })
    );
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    );
  }
}
