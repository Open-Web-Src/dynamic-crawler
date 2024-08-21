// lib/stacks/main-stack.ts
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { EcrStack } from "./ecr-stack";
import { VpcStack } from "./vpc-stack";
import { SecurityGroupsStack } from "./security-groups-stack";
import { EcsClusterStack } from "./ecs-cluster-stack";
import { AlbStack } from "./alb-stack";
import { PipelineStack } from "./pipeline.stack";
import { Ec2Stack } from "./ec2-stack";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcStack = new VpcStack(this, "VpcStack");
    const ecrStack = new EcrStack(this, "EcrStack");

    const sgStack = new SecurityGroupsStack(this, "SecurityGroupsStack", {
      vpc: vpcStack.vpc,
    });

    const ecsClusterStack = new EcsClusterStack(this, "EcsClusterStack", {
      vpc: vpcStack.vpc,
      albSecurityGroup: sgStack.albSecurityGroup,
      reactappSecurityGroup: sgStack.reactappSecurityGroup,
      flaskappSecurityGroup: sgStack.flaskappSecurityGroup,
      crawlerSecurityGroup: sgStack.crawlerSecurityGroup,
      redisSecurityGroup: sgStack.redisSecurityGroup,
      seleniumSecurityGroup: sgStack.seleniumSecurityGroup,
      ecrRepos: ecrStack.repositories,
    });

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
      sourceBucketName: process.env.SOURCE_BUCKET_NAME!,
    });

    new Ec2Stack(this, "Ec2Stack", {
      vpc: vpcStack.vpc,
      securityGroup: sgStack.gitlabRunnerSecurityGroup,
      keyName: process.env.GITLAB_RUNNER_SSH_KEYNAME!,
      userData: cdk.aws_ec2.UserData.forLinux(),
    });
  }
}
