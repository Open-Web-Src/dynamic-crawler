import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { SecurityGroupConstruct } from "@constructs";

export class SecurityGroupsStack extends cdk.Stack {
  public readonly crawlerSecurityGroup: SecurityGroupConstruct;
  public readonly redisSecurityGroup: SecurityGroupConstruct;
  public readonly seleniumSecurityGroup: SecurityGroupConstruct;

  constructor(
    scope: Construct,
    id: string,
    props: { vpc: ec2.IVpc } & cdk.StackProps
  ) {
    super(scope, id, props);

    // CRAWLER
    this.crawlerSecurityGroup = new SecurityGroupConstruct(this, "CrawlerSG", {
      vpc: props.vpc,
      description: "Security group for Crawler",
    });

    // REDIS
    this.redisSecurityGroup = new SecurityGroupConstruct(this, "RedisSG", {
      vpc: props.vpc,
      description: "Security group for Redis",
      ingressRules: [
        {
          peer: this.crawlerSecurityGroup.securityGroup,
          connection: cdk.aws_ec2.Port.allTraffic(),
          description: "Allow all traffic from Crawler",
        },
      ],
    });

    // SELENIUM
    this.seleniumSecurityGroup = new SecurityGroupConstruct(
      this,
      "SeleniumSG",
      {
        vpc: props.vpc,
        description: "Security group for Selenium",
        ingressRules: [
          {
            peer: this.crawlerSecurityGroup.securityGroup,
            connection: cdk.aws_ec2.Port.allTraffic(),
            description: "Allow all traffic from Crawler",
          },
        ],
      }
    );
  }
}
