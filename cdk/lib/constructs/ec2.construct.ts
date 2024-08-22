import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";

interface Ec2ConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  keyName: string;
  vpcSubnets: ec2.SubnetSelection; // Subnets selection
  userDataCommands?: string[]; // Optional user data commands to run on instance startup
  instanceType?: ec2.InstanceType; // Optional: defaults to t3.micro
  machineImage?: ec2.IMachineImage; // Optional: defaults to the latest Amazon Linux
  role?: iam.IRole; // Optional: defaults to a new IAM role with EC2 and S3 full access
}

export class Ec2Construct extends Construct {
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: Ec2ConstructProps) {
    super(scope, id);

    const userData = ec2.UserData.forLinux();
    if (props.userDataCommands) {
      userData.addCommands(...props.userDataCommands);
    }

    const role =
      props.role ||
      new iam.Role(this, "InstanceRole", {
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2FullAccess"),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        ],
      });

    this.instance = new ec2.Instance(this, "Instance", {
      vpc: props.vpc,
      instanceType:
        props.instanceType ||
        ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: props.machineImage || ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: props.securityGroup,
      keyPair: ec2.KeyPair.fromKeyPairName(this, "KeyPair", props.keyName),
      role: role,
      vpcSubnets: props.vpcSubnets,
      userData,
    });
  }
}
