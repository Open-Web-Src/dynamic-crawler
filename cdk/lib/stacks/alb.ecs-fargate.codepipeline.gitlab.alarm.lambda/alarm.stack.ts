import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import {
  CloudWatchAlarmConstruct,
  CloudWatchCompositeAlarmConstruct,
} from "@constructs";

interface MetricDefinition {
  namespace: string;
  metricName: string;
  dimensionsMap: { [key: string]: string };
  period?: cdk.Duration;
  statistic?: string;
}

interface AlarmStackProps extends cdk.StackProps {
  scalingLambdaArn: string; // ARN of the Lambda function that will handle scaling
}

export class AlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlarmStackProps) {
    super(scope, id, props);

    // Define your metrics here
    const queueLengthMetric: MetricDefinition = {
      namespace: "Custom/QueueLength",
      metricName: "QueueLength",
      dimensionsMap: {
        QueueName: "MyQueue",
      },
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.AVERAGE,
    };

    const cpuMetric: MetricDefinition = {
      namespace: "AWS/EC2",
      metricName: "CPUUtilization",
      dimensionsMap: {
        InstanceId: "i-0123456789abcdef0",
      },
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.AVERAGE,
    };

    // Create individual alarms for the conditions
    const queueLengthAboveZero = new CloudWatchAlarmConstruct(
      this,
      "QueueLengthAboveZero",
      {
        namespace: queueLengthMetric.namespace,
        metricName: queueLengthMetric.metricName,
        dimensions: queueLengthMetric.dimensionsMap,
        period: queueLengthMetric.period ?? cdk.Duration.minutes(1),
        statistic: queueLengthMetric.statistic ?? cloudwatch.Stats.AVERAGE,
        alarmName: "QueueLengthAboveZeroAlarm",
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: "Queue length >= 1",
      }
    );

    const queueLengthAboveTen = new CloudWatchAlarmConstruct(
      this,
      "QueueLengthAboveTen",
      {
        namespace: queueLengthMetric.namespace,
        metricName: queueLengthMetric.metricName,
        dimensions: queueLengthMetric.dimensionsMap!,
        period: queueLengthMetric.period ?? cdk.Duration.minutes(1),
        statistic: queueLengthMetric.statistic ?? cloudwatch.Stats.AVERAGE,
        alarmName: "QueueLengthAboveTenAlarm",
        threshold: 10,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: "Queue length >= 10",
      }
    );

    const queueLengthZero = new CloudWatchAlarmConstruct(
      this,
      "QueueLengthZero",
      {
        namespace: queueLengthMetric.namespace,
        metricName: queueLengthMetric.metricName,
        dimensions: queueLengthMetric.dimensionsMap!,
        period: queueLengthMetric.period ?? cdk.Duration.minutes(1),
        statistic: queueLengthMetric.statistic ?? cloudwatch.Stats.AVERAGE,
        alarmName: "QueueLengthZeroAlarm",
        threshold: 0,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: "Queue length <= 0",
      }
    );

    const cpuAboveEighty = new CloudWatchAlarmConstruct(
      this,
      "CpuAboveEighty",
      {
        namespace: cpuMetric.namespace,
        metricName: cpuMetric.metricName,
        dimensions: cpuMetric.dimensionsMap!,
        period: cpuMetric.period ?? cdk.Duration.minutes(1),
        statistic: cpuMetric.statistic ?? cloudwatch.Stats.AVERAGE,
        alarmName: "CpuAboveEightyAlarm",
        threshold: 80,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: "CPU usage > 80%",
      }
    );

    const cpuBelowTwenty = new CloudWatchAlarmConstruct(
      this,
      "CpuBelowTwenty",
      {
        namespace: cpuMetric.namespace,
        metricName: cpuMetric.metricName,
        dimensions: cpuMetric.dimensionsMap!,
        period: cpuMetric.period ?? cdk.Duration.minutes(1),
        statistic: cpuMetric.statistic ?? cloudwatch.Stats.AVERAGE,
        alarmName: "CpuBelowTwentyAlarm",
        threshold: 20,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription: "CPU usage < 20%",
      }
    );

    // Create composite alarms for the different scaling scenarios

    // Scale up +1: Queue >= 1 and CPU > 80%
    new CloudWatchCompositeAlarmConstruct(this, "ScaleUpOneCompositeAlarm", {
      alarmArns: [
        queueLengthAboveZero.alarm.alarmArn,
        cpuAboveEighty.alarm.alarmArn,
      ],
      compositeOperator: "AND",
      compositeAlarmName: "ScaleUpOneCompositeAlarm",
      alarmActions: [
        new cloudwatch_actions.LambdaAction(
          lambda.Function.fromFunctionArn(
            this,
            "ScalingLambdaUpOne",
            props.scalingLambdaArn
          )
        ),
      ],
    });

    // Scale up +2: Queue >= 10 and CPU > 80%
    new CloudWatchCompositeAlarmConstruct(this, "ScaleUpTwoCompositeAlarm", {
      alarmArns: [
        queueLengthAboveTen.alarm.alarmArn,
        cpuAboveEighty.alarm.alarmArn,
      ],
      compositeOperator: "AND",
      compositeAlarmName: "ScaleUpTwoCompositeAlarm",
      alarmActions: [
        new cloudwatch_actions.LambdaAction(
          lambda.Function.fromFunctionArn(
            this,
            "ScalingLambdaUpTwo",
            props.scalingLambdaArn
          )
        ),
      ],
    });

    // Scale down -1: Queue <= 0 and CPU < 20%
    new CloudWatchCompositeAlarmConstruct(this, "ScaleDownOneCompositeAlarm", {
      alarmArns: [
        queueLengthZero.alarm.alarmArn,
        cpuBelowTwenty.alarm.alarmArn,
      ],
      compositeOperator: "AND",
      compositeAlarmName: "ScaleDownOneCompositeAlarm",
      alarmActions: [
        new cloudwatch_actions.LambdaAction(
          lambda.Function.fromFunctionArn(
            this,
            "ScalingLambdaDownOne",
            props.scalingLambdaArn
          )
        ),
      ],
    });
  }
}
