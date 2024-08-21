import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { PipelineConstruct, EcsFargateConstruct } from "@constructs";

export class PipelineStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: {
      services: { [key: string]: EcsFargateConstruct };
      sourceBucketName: string;
    } & cdk.StackProps
  ) {
    super(scope, id, props);

    new PipelineConstruct(this, "PipelineConstruct", {
      services: Object.keys(props.services).reduce((acc, key) => {
        acc[key] = props.services[key].service;
        return acc;
      }, {} as { [key: string]: cdk.aws_ecs.FargateService }),
      sourceConfig: {
        type: "S3",
        s3BucketName: props.sourceBucketName,
      },
      environmentVariables: {
        GITLAB_USERNAME: process.env.GITLAB_USERNAME!,
        GITLAB_TOKEN: process.env.GITLAB_TOKEN!,
        BRANCH: process.env.BRANCH!,
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION!,
        ACCOUNT_ID: process.env.ACCOUNT_ID!,
        DOCKERHUB_USERNAME: process.env.DOCKERHUB_USERNAME!,
        DOCKERHUB_PASSWORD: process.env.DOCKERHUB_PASSWORD!,
      },
    });
  }
}
