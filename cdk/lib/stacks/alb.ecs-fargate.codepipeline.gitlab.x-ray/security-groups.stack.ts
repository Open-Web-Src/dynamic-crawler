import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { SecurityGroupConstruct } from "@constructs";

export class SecurityGroupsStack extends cdk.Stack {
  public readonly albSecurityGroup: SecurityGroupConstruct;
  public readonly reactappSecurityGroup: SecurityGroupConstruct;
  public readonly flaskappSecurityGroup: SecurityGroupConstruct;
  public readonly crawlerSecurityGroup: SecurityGroupConstruct;
  public readonly redisSecurityGroup: SecurityGroupConstruct;
  public readonly seleniumSecurityGroup: SecurityGroupConstruct;
  public readonly gitlabRunnerSecurityGroup: SecurityGroupConstruct;

  constructor(
    scope: Construct,
    id: string,
    props: { vpc: ec2.IVpc } & cdk.StackProps
  ) {
    super(scope, id, props);

    // ALB
    this.albSecurityGroup = new SecurityGroupConstruct(this, "ALBSG", {
      vpc: props.vpc,
      description: "Security group for ALB",
      ingressRules: [
        {
          peer: cdk.aws_ec2.Peer.anyIpv4(),
          connection: cdk.aws_ec2.Port.tcp(80),
          description: "Allow HTTP traffic",
        },
        {
          peer: cdk.aws_ec2.Peer.anyIpv4(),
          connection: cdk.aws_ec2.Port.tcp(443),
          description: "Allow HTTPS traffic",
        },
      ],
    });

    // REACT_APP
    this.reactappSecurityGroup = new SecurityGroupConstruct(
      this,
      "ReactAppSG",
      {
        vpc: props.vpc,
        description: "Security group for React app",
        ingressRules: [
          {
            peer: this.albSecurityGroup.securityGroup,
            connection: cdk.aws_ec2.Port.allTraffic(),
            description: "Allow all traffic from ALB",
          },
        ],
      }
    );

    // FLASK_APP
    this.flaskappSecurityGroup = new SecurityGroupConstruct(
      this,
      "FlaskAppSG",
      {
        vpc: props.vpc,
        description: "Security group for Flask app",
        ingressRules: [
          {
            peer: this.reactappSecurityGroup.securityGroup,
            connection: cdk.aws_ec2.Port.tcp(5001),
            description: "Allow TCP(5001) traffic from React",
          },
        ],
      }
    );
  }
}
