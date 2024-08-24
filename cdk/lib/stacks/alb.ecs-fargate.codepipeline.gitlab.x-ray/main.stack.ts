import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as xray from "aws-cdk-lib/aws-xray";
import { SecurityGroupsStack } from "./security-groups.stack";
import { EcsFargateClusterStack } from "./ecs-fargate.stack";
import { AlbStack } from "./alb.stack";
import { PipelineStack } from "./pipeline.stack";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: process.env.ACCOUNT_ID,
        region: process.env.AWS_DEFAULT_REGION,
      },
    });

    // Load an existing VPC by its ID or other criteria
    const vpc = ec2.Vpc.fromLookup(this, "ExistingVpc", {
      vpcId: process.env.VPC_ID!,
    });

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

    const sgStack = new SecurityGroupsStack(this, "SecurityGroupsStack", {
      vpc,
    });

    const ecsClusterStack = new EcsFargateClusterStack(
      this,
      "EcsClusterStack",
      {
        vpc,
        reactappSecurityGroup: sgStack.reactappSecurityGroup,
        flaskappSecurityGroup: sgStack.flaskappSecurityGroup,
        reactappRepo,
        flaskappRepo,
      }
    );

    new AlbStack(this, "AlbStack", {
      vpc,
      albSecurityGroup: sgStack.albSecurityGroup,
      reactappService: ecsClusterStack.reactappService,
    });

    // Create a custom X-Ray sampling rule
    new xray.CfnSamplingRule(this, "MyCustomSamplingRule", {
      samplingRule: {
        ruleName: "MyCustomRule",
        priority: 1,
        fixedRate: 0.05,
        reservoirSize: 10,
        serviceName: "*", // or specify a service name
        serviceType: "*",
        resourceArn: "*", // Correct property name
        host: "*",
        httpMethod: "*",
        urlPath: "*",
        version: 1,
      },
    });

    new PipelineStack(this, "PipelineStack", {
      services: {
        flaskapp: ecsClusterStack.flaskappService,
        reactapp: ecsClusterStack.reactappService,
      },
    });
  }
}
