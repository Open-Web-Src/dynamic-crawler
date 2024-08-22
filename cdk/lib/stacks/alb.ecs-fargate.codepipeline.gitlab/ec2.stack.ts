import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  VpcConstruct,
  SecurityGroupConstruct,
  Ec2Construct,
} from "@constructs";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface Ec2StackProps extends cdk.StackProps {
  vpc: VpcConstruct;
  securityGroup: SecurityGroupConstruct;
  keyName: string;
}

export class Ec2Stack extends cdk.Stack {
  public readonly instance: Ec2Construct;

  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    new Ec2Construct(this, "Ec2Construct", {
      vpc: props.vpc.vpc,
      securityGroup: props.securityGroup.securityGroup,
      keyName: props.keyName,
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
