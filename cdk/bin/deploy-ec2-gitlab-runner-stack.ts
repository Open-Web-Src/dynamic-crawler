#!/usr/bin/env node
import "source-map-support/register";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Ec2Construct, SecurityGroupConstruct } from "@constructs";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

class GitLabRunnerStack extends cdk.Stack {
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
      vpcId: process.env.VPC_ID!, // Replace with your actual VPC ID or environment variable
    });

    // GITLAB_RUNNER
    const gitlabRunnerSecurityGroup = new SecurityGroupConstruct(
      this,
      "GitLabRunnerSG",
      {
        vpc,
        description: "Security group for GitLab Runner",
        ingressRules: [
          {
            peer: ec2.Peer.anyIpv4(),
            connection: ec2.Port.tcp(22), // SSH port
            description: "Allow SSH Access",
          },
        ],
      }
    );

    new Ec2Construct(this, "Ec2Construct", {
      vpc,
      securityGroup: gitlabRunnerSecurityGroup.securityGroup,
      keyName: process.env.GITLAB_RUNNER_SSH_KEYNAME!,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      userDataCommands: [
        "sudo yum update -y",
        "sudo yum install -y curl git",
        "curl -L --output script.rpm.sh https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh",
        "sudo bash script.rpm.sh",
        "sudo yum install -y gitlab-runner",
        `sudo gitlab-runner register --non-interactive --url ${process.env.GITLAB_URL} --registration-token ${process.env.GITLAB_REGISTRATION_TOKEN} --executor shell --description "GitLab Runner on EC2" --tag-list "ec2,gitlab,runner" --run-untagged --locked=false`,
      ],
    });
  }
}

const app = new cdk.App();
new GitLabRunnerStack(app, "GitLabRunnerStack");

app.synth();
