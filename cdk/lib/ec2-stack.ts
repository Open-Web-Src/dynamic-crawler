import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

interface EC2StackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  keyName: string;
}

export class EC2Stack extends cdk.Stack {
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: EC2StackProps) {
    super(scope, id, props);

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "sudo yum update -y",
      "sudo yum install -y curl git",
      "curl -L --output script.rpm.sh https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh",
      "sudo bash script.rpm.sh",
      "sudo yum install -y gitlab-runner",
      `sudo gitlab-runner register --non-interactive --url ${process.env.GITLAB_URL} --registration-token ${process.env.GITLAB_REGISTRATION_TOKEN} --executor shell --description "GitLab Runner on EC2" --tag-list "ec2,gitlab,runner" --run-untagged --locked=false`
    );

    const role = new iam.Role(this, "GitLabRunnerRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
      ],
    });

    this.instance = new ec2.Instance(this, "GitLabRunnerInstance", {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      securityGroup: props.securityGroup,
      keyName: props.keyName,
      role: role,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      userData,
    });
  }
}
