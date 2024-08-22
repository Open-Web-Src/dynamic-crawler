import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { VpcStack } from "./vpc.stack";
import { SecurityGroupsStack } from "./security-groups.stack";
import { EcsFargateClusterStack } from "./ecs-fargate.stack";
import { AlbStack } from "./alb.stack";
import { PipelineStack } from "./pipeline.stack";
// import { Ec2Stack } from "./ec2.stack";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcStack = new VpcStack(this, "VpcStack");

    // Import existing ECR repositories
    const reactappRepo = ecr.Repository.fromRepositoryName(
      this,
      "ReactAppRepo",
      "reactapp"
    );
    const flaskappRepo = ecr.Repository.fromRepositoryName(
      this,
      "FlaskAppRepo",
      "flaskapp"
    );
    const crawlerRepo = ecr.Repository.fromRepositoryName(
      this,
      "CrawlerRepo",
      "crawler"
    );
    const redisLoggingRepo = ecr.Repository.fromRepositoryName(
      this,
      "RedisLoggingRepo",
      "redis_logging"
    );

    const sgStack = new SecurityGroupsStack(this, "SecurityGroupsStack", {
      vpc: vpcStack.vpc,
    });

    const ecsClusterStack = new EcsFargateClusterStack(
      this,
      "EcsClusterStack",
      {
        vpc: vpcStack.vpc,
        albSecurityGroup: sgStack.albSecurityGroup,
        reactappSecurityGroup: sgStack.reactappSecurityGroup,
        flaskappSecurityGroup: sgStack.flaskappSecurityGroup,
        crawlerSecurityGroup: sgStack.crawlerSecurityGroup,
        redisSecurityGroup: sgStack.redisSecurityGroup,
        seleniumSecurityGroup: sgStack.seleniumSecurityGroup,
        reactappRepo,
        flaskappRepo,
        crawlerRepo,
        redisLoggingRepo,
      }
    );

    new AlbStack(this, "AlbStack", {
      vpc: vpcStack.vpc,
      albSecurityGroup: sgStack.albSecurityGroup,
      reactappService: ecsClusterStack.reactappService,
    });

    new PipelineStack(this, "PipelineStack", {
      services: {
        crawlerMain: ecsClusterStack.crawlerMainService,
        crawlerReplica: ecsClusterStack.crawlerReplicaService,
        flaskapp: ecsClusterStack.flaskappService,
        reactapp: ecsClusterStack.reactappService,
        redis: ecsClusterStack.redisService,
        selenium: ecsClusterStack.seleniumService,
      },
    });

    // new Ec2Stack(this, "Ec2Stack", {
    //   vpc: vpcStack.vpc,
    //   securityGroup: sgStack.gitlabRunnerSecurityGroup,
    //   keyName: process.env.GITLAB_RUNNER_SSH_KEYNAME!,
    // });
  }
}
