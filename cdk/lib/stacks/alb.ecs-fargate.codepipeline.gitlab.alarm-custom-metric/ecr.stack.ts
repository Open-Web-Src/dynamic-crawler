import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { EcrConstruct } from "@constructs";

export class EcrStack extends cdk.Stack {
  public readonly repositories: { [key: string]: EcrConstruct };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repositories = {
      flaskapp: new EcrConstruct(this, "FlaskAppRepo", {
        repositoryName: "flaskapp",
        ssmParameterName: "/ecr/flaskapp_repo_uri",
      }),
      reactapp: new EcrConstruct(this, "ReactAppRepo", {
        repositoryName: "reactapp",
        ssmParameterName: "/ecr/reactapp_repo_uri",
      }),
      crawler: new EcrConstruct(this, "CrawlerRepo", {
        repositoryName: "crawler",
        ssmParameterName: "/ecr/crawler_repo_uri",
      }),
      monitor: new EcrConstruct(this, "RedisLoggingRepo", {
        repositoryName: "redis_logging",
        ssmParameterName: "/ecr/redis_logging_repo_uri",
      }),
    };
  }
}
