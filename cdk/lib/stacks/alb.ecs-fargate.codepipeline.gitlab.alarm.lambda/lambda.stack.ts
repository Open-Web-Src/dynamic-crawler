import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaConstruct, LambdaCodeType } from "@constructs";

interface LambdaStackProps extends cdk.StackProps {
  ecsClusterName: string;
  ecsServiceName: string;
  lambdaCodeType: LambdaCodeType;
  inlineCode?: string;
  assetPath?: string;
  s3BucketName?: string;
  s3ObjectKey?: string;
  ecrRepositoryName?: string;
  environment?: { [key: string]: string };
}

export class LambdaStack extends cdk.Stack {
  public readonly ecsUpdateLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Define the ECS permissions policy
    const ecsPolicyStatement = new iam.PolicyStatement({
      actions: ["ecs:UpdateService"],
      resources: [
        `arn:aws:ecs:${this.region}:${this.account}:service/${props.ecsClusterName}/${props.ecsServiceName}`,
      ],
    });

    // Create the Lambda function to update ECS service for scaling
    this.ecsUpdateLambda = new LambdaConstruct(this, "EcsUpdateLambda", {
      codeType: props.lambdaCodeType,
      handler: props.inlineCode ? "index.handler" : undefined, // Handler is required only for non-Docker and non-inline code types
      runtime: props.inlineCode ? lambda.Runtime.NODEJS_16_X : undefined, // Runtime is required only for non-Docker and non-inline code types
      inlineCode: props.inlineCode,
      assetPath: props.assetPath,
      bucketName: props.s3BucketName,
      bucketKey: props.s3ObjectKey,
      ecrRepoName: props.ecrRepositoryName,
      environment: {
        ...props.environment,
        ECS_CLUSTER_NAME: props.ecsClusterName,
        ECS_SERVICE_NAME: props.ecsServiceName,
      },
      rolePolicyStatements: [ecsPolicyStatement],
    }).function;
  }
}
