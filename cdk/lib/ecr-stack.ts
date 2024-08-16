import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class ECRStack extends cdk.Stack {
  public readonly flaskappRepo: ecr.Repository;
  public readonly reactappRepo: ecr.Repository;
  public readonly crawlerRepo: ecr.Repository;
  // public readonly redisLoggingRepo: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.flaskappRepo = new ecr.Repository(this, "FlaskappRepo");
    this.reactappRepo = new ecr.Repository(this, "ReactappRepo");
    this.crawlerRepo = new ecr.Repository(this, "CrawlerRepo");
    // this.redisLoggingRepo = new ecr.Repository(this, "RedisLoggingRepo");

    // Store ECR URIs in SSM Parameter Store
    new ssm.StringParameter(this, "FlaskappRepoUri", {
      parameterName: "/ecr/flaskapp_repo_uri",
      stringValue: this.flaskappRepo.repositoryUri,
    });

    new ssm.StringParameter(this, "ReactappRepoUri", {
      parameterName: "/ecr/reactapp_repo_uri",
      stringValue: this.reactappRepo.repositoryUri,
    });

    new ssm.StringParameter(this, "CrawlerRepoUri", {
      parameterName: "/ecr/crawler_repo_uri",
      stringValue: this.crawlerRepo.repositoryUri,
    });

    // new ssm.StringParameter(this, "RedisLoggingRepoUri", {
    //   parameterName: "/ecr/redis_logging_repo_uri",
    //   stringValue: this.redisLoggingRepo.repositoryUri,
    // });
  }
}
