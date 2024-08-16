#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AlarmStack } from "../lib/alarm-stack";
import { CompositeAlarmStack } from "../lib/alarm-composite-stack";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
// import * as sns from 'aws-cdk-lib/aws-sns';
// import * as sns_actions from 'aws-cdk-lib/aws-cloudwatch-actions';

const app = new cdk.App();

// Action when alarm triggers
// const snsTopic = sns.Topic.fromTopicArn(app, 'SnsTopic', 'arn:aws:sns:ap-southeast-2:014498631767:your-topic-name'); // Replace with your SNS topic ARN
// const snsAction = new sns_actions.SnsAction(snsTopic);

// ECS Alarm
const clusterName = "ECSClusterStack-MyEcsClusterE7C96753-XAkhThBCEVVD";
const serviceName = "ECSClusterStack-MyReactAppService9C3EF296-Uy6GTJDYqgtl";
const reactEcsCpuAlarmStack = new AlarmStack(app, "ReactEcsCpuAlarmStack", {
  namespace: "AWS/ECS",
  metricName: "CPUUtilization",
  dimensions: {
    ClusterName: clusterName,
    ServiceName: serviceName,
  },
  threshold: 80,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  evaluationPeriods: 1,
  alarmName: `${clusterName}-${serviceName}-CpuAlarm`,
  alarmDescription: "Alarm if ECS CPU utilization exceeds 80%",
  // alarmActions: [snsAction],
});

// ALB Alarm
const loadBalancer = "app/ALBSta-My-87nfoUFyYI8u/9473aa5a5f3c1f0f";
const tagetGroup = "targetgroup/ALBSta-My-H7M9LTMIRTHM/749c2bbca9b361f0";
const albLowTrafficAlarmStack = new AlarmStack(app, "AlbLowTrafficAlarmStack", {
  namespace: "AWS/ApplicationELB",
  metricName: "RequestCount",
  dimensions: {
    LoadBalancer: loadBalancer,
    TargetGroup: tagetGroup,
  },
  threshold: 10,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  evaluationPeriods: 1,
  alarmName: `${loadBalancer}-${tagetGroup}-AlbLowTrafficAlarm`,
  alarmDescription: "Alarm if ALB request count is less than 10",
  // alarmActions: [snsAction],
});

new CompositeAlarmStack(app, "CompositeAlarmStack", {
  alarmArns: [
    cdk.Fn.importValue(reactEcsCpuAlarmStack.alarm.alarmArn),
    cdk.Fn.importValue(albLowTrafficAlarmStack.alarm.alarmArn),
  ],
  compositeOperator: "AND", // Change to 'OR' if needed
  compositeAlarmName: `${reactEcsCpuAlarmStack.alarm.alarmName}-${albLowTrafficAlarmStack.alarm.alarmName}`,
  compositeAlarmDescription:
    "Composite alarm for ECS CPU utilization and ALB low traffic",
  // alarmActions: [snsAction], // Add actions to the composite alarm
});

app.synth();
