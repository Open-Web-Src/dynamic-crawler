import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";

interface S3ConstructProps {
  bucketName?: string;
  versioned?: boolean;
  removalPolicy?: cdk.RemovalPolicy;
  autoDeleteObjects?: boolean;
}

export class S3Construct extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: S3ConstructProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "S3Bucket", {
      bucketName: props?.bucketName,
      versioned: props?.versioned ?? false,
      removalPolicy: props?.removalPolicy ?? cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props?.autoDeleteObjects ?? false,
    });
  }
}
