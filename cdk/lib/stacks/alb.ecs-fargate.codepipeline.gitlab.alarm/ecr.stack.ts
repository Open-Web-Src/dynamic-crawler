import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { EcrConstruct } from "@constructs";

export class EcrStack extends cdk.Stack {
  public readonly repositories: { [key: string]: EcrConstruct };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repositories = {
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
