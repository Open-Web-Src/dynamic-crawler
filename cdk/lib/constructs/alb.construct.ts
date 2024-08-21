import { Construct } from "constructs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

interface AlbConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class AlbConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.securityGroup,
    });
  }

  public addListener(
    id: string,
    incomingRequestPort: number,
    targetGroupPort: number,
    containerPort: number,
    targets: ecs.FargateService[],
    protocol: elbv2.ApplicationProtocol = elbv2.ApplicationProtocol.HTTP,
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
        port: targetGroupPort,
        targets: targets.map((service) =>
          service.loadBalancerTarget({
            containerName: service.serviceName,
            containerPort,
          })
        ),
      });
    }
  }
}
