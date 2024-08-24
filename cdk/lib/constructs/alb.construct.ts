import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { S3Construct } from "@constructs";

interface AlbConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.SecurityGroup;
  xrayEnabled?: boolean; // Enable X-Ray tracing
  accessLogsEnabled?: boolean; // Enable access logging to S3
}

export class AlbConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.securityGroup,
      ...(props.xrayEnabled ? { accessLogsPrefix: "alb-xray" } : {}),
    });

    // Enable Access Logs if specified
    if (props.accessLogsEnabled) {
      const accessLogsBucket = new S3Construct(this, "AccessLogsBucket", {
        bucketName: `alb-access-logs-${cdk.Names.uniqueId(this)}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

      this.alb.logAccessLogs(accessLogsBucket.bucket);
    }

    // Enable X-Ray tracing if specified
    if (props.xrayEnabled) {
      // Attach the X-Ray policy to the load balancer's role
      const xrayPolicy = new iam.PolicyStatement({
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      });
      const lbRole = this.alb.node.tryFindChild("DefaultPolicy") as iam.Role;
      lbRole?.addToPrincipalPolicy(xrayPolicy);
    }
  }

  public addListener(
    id: string,
    incomingRequestPort: number,
    targets: {
      service: ecs.FargateService;
      containerName: string;
      containerPort: number;
    }[],
    protocol: elbv2.ApplicationProtocol = elbv2.ApplicationProtocol.HTTP,
    hostPort?: number,
    certificateArn?: string
  ) {
    const listenerProps: elbv2.BaseApplicationListenerProps = {
      port: incomingRequestPort,
      protocol,
      open: true,
      ...(protocol === elbv2.ApplicationProtocol.HTTPS && certificateArn
        ? {
            certificates: [
              acm.Certificate.fromCertificateArn(
                this,
                `${id}Certificate`,
                certificateArn
              ),
            ],
          }
        : {}),
    };

    const listener = this.alb.addListener(id, listenerProps);

    if (protocol === elbv2.ApplicationProtocol.HTTP && !targets.length) {
      // If this is an HTTP listener intended for redirection, set up the redirect action
      listener.addAction(`${id}RedirectToHTTPS`, {
        action: elbv2.ListenerAction.redirect({
          protocol: "HTTPS",
          port: "443",
          permanent: true,
        }),
      });
    } else {
      // Add targets if it's a normal listener
      listener.addTargets(`${id}Targets`, {
        port: hostPort ?? targets[0].containerPort, // hostPort is only be used in EC2 Launch type
        targets: targets.map(({ service, containerName, containerPort }) =>
          service.loadBalancerTarget({
            containerName,
            containerPort,
          })
        ),
      });
    }
  }
}
