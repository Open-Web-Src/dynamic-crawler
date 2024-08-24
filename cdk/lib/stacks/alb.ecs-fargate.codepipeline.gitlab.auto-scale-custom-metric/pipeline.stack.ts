import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { PipelineConstruct, EcsFargateConstruct } from "@constructs";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export class PipelineStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: {
      services: { [key: string]: EcsFargateConstruct };
    } & cdk.StackProps
  ) {
    super(scope, id, props);

    new PipelineConstruct(this, "PipelineConstruct", {
      sourceConfig: {
        type: "GitLab",
        gitRepo: process.env.GITLAB_REPO!,
        gitBranch: process.env.GITLAB_BRANCH!,
        gitOwner: process.env.GITLAB_OWNER!,
        gitConnectionArn: process.env.GITLAB_CONNECTION_ARN!,
      },
      environmentVariables: {
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION!,
        ACCOUNT_ID: process.env.ACCOUNT_ID!,
        DOCKERHUB_USERNAME: process.env.DOCKERHUB_USERNAME!,
        DOCKERHUB_PASSWORD: process.env.DOCKERHUB_PASSWORD!,
        CRAWLER_MAIN_CONTAINER_NAME: process.env.CRAWLER_MAIN_CONTAINER_NAME!,
        CRAWLER_REPLICA_CONTAINER_NAME:
          process.env.CRAWLER_MAIN_CONTAINER_NAME!,
        FLASKAPP_CONTAINER_NAME: process.env.FLASKAPP_CONTAINER_NAME!,
        REACTAPP_CONTAINER_NAME: process.env.REACTAPP_CONTAINER_NAME!,
        SELENIUM_CONTAINER_NAME: process.env.SELENIUM_CONTAINER_NAME!,
        REDIS_CONTAINER_NAME: process.env.REDIS_CONTAINER_NAME!,
        REDIS_LOGGING_CONTAINER_NAME: process.env.REDIS_LOGGING_CONTAINER_NAME!,
      },
      deploymentStages: [
        {
          stageName: "Dependencies",
          services: {
            redis: props.services["redis"].service,
            selenium: props.services["selenium"].service,
          },
        },
        {
          stageName: "Crawler",
          services: {
            crawler_main: props.services["crawler_main"].service,
            crawler_replica: props.services["crawler_replica"].service,
          },
        },
        {
          stageName: "BackendAndMonitoring",
          services: {
            flaskapp: props.services["flaskapp"].service,
            redis_logging: props.services["redis_logging"].service,
          },
        },
        {
          stageName: "Frontend",
          services: {
            reactapp: props.services["reactapp"].service,
          },
        },
      ],
    });
  }
}
