import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

interface AlarmStackProps extends cdk.StackProps {
  namespace: string;
  metricName: string;
  dimensions: { [key: string]: string };
  threshold: number;
  comparisonOperator: cloudwatch.ComparisonOperator;
  evaluationPeriods: number;
  alarmName: string;
  alarmDescription?: string;
  alarmActions?: cloudwatch.IAlarmAction[]; // IAlarmAction instances for alarm actions
}

export class AlarmStack extends cdk.Stack {
  public readonly alarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: AlarmStackProps) {
    super(scope, id, props);

    const metric = new cloudwatch.Metric({
      namespace: props.namespace,
      metricName: props.metricName,
      dimensionsMap: props.dimensions,
      period: cdk.Duration.minutes(1),
    });

    this.alarm = new cloudwatch.Alarm(this, "Alarm", {
      metric: metric,
      threshold: props.threshold,
      evaluationPeriods: props.evaluationPeriods,
      comparisonOperator: props.comparisonOperator,
      alarmName: props.alarmName,
      alarmDescription: props.alarmDescription,
      actionsEnabled: props.alarmActions ? true : false,
    });

    if (props.alarmActions) {
      this.alarm.addAlarmAction(...props.alarmActions);
    }

    // Output the alarm ARN
    new cdk.CfnOutput(this, "AlarmArn", {
      value: this.alarm.alarmArn,
      exportName: `${props.alarmName}-Arn`,
    });
  }
}
