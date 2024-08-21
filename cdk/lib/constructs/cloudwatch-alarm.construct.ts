import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cdk from "aws-cdk-lib";

interface CloudWatchAlarmConstructProps {
  namespace: string;
  metricName: string;
  dimensions: { [key: string]: string };
  threshold: number;
  comparisonOperator: cloudwatch.ComparisonOperator;
  evaluationPeriods: number;
  alarmName: string;
  alarmDescription?: string;
  alarmActions?: cloudwatch.IAlarmAction[]; // Optional alarm actions
}

export class CloudWatchAlarmConstruct extends Construct {
  public readonly alarm: cloudwatch.Alarm;

  constructor(
    scope: Construct,
    id: string,
    props: CloudWatchAlarmConstructProps
  ) {
    super(scope, id);

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
  }
}
