import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface SecurityGroupsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class SecurityGroupsStack extends cdk.Stack {
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly reactappSecurityGroup: ec2.SecurityGroup;
  public readonly flaskappSecurityGroup: ec2.SecurityGroup;
  public readonly crawlerSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;
  public readonly seleniumSecurityGroup: ec2.SecurityGroup;
  public readonly gitlabRunnerSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupsStackProps) {
    super(scope, id, props);

    // ALB Security Group
    this.albSecurityGroup = new ec2.SecurityGroup(this, "ALBSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for ALB",
    });
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic from anywhere"
    );
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic from anywhere"
    );

    // React App Security Group
    this.reactappSecurityGroup = new ec2.SecurityGroup(this, "ReactAppSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for React app",
    });
    this.reactappSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic from ALB"
    );

    // Crawler Security Group
    this.crawlerSecurityGroup = new ec2.SecurityGroup(this, "CrawlerSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for Scrapy RT",
    });

    // Redis Security Group
    this.redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for Redis",
    });
    this.redisSecurityGroup.addIngressRule(
      this.crawlerSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic from Celery Worker"
    );

    // Selenium Security Group
    this.seleniumSecurityGroup = new ec2.SecurityGroup(this, "SeleniumSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for Selenium",
    });
    this.seleniumSecurityGroup.addIngressRule(
      this.crawlerSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic from Scrapy RT"
    );

    // Flask App Security Group
    this.flaskappSecurityGroup = new ec2.SecurityGroup(this, "FlaskAppSG", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for Flask app",
    });
    this.flaskappSecurityGroup.addIngressRule(
      this.reactappSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic from React app"
    );
    this.flaskappSecurityGroup.addIngressRule(
      this.crawlerSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic from Scrapy RT"
    );

    // GitLab Runner Security Group
    this.gitlabRunnerSecurityGroup = new ec2.SecurityGroup(
      this,
      "GitLabRunnerSG",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
      }
    );
    this.gitlabRunnerSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH Access"
    );
  }
}
