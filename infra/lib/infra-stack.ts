import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB-table
    const table = new dynamodb.Table(this, "UrlsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // easy cleanup
    });

    const backendRoot = path.join(__dirname, "../../backend");
    
    // Lambdas
    const lambdaProps = {
      runtime: Runtime.NODEJS_24_X,
      environment: { TABLE_NAME: table.tableName },
      bundling: { minify: true, sourceMap: true },
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
    };

    const createFn = new lambda.NodejsFunction(this, "CreateFn", {
      entry: path.join(__dirname, "../../backend/src/create.ts"),
      ...lambdaProps,
    });

    const redirectFn = new lambda.NodejsFunction(this, "RedirectFn", {
      entry: path.join(__dirname, "../../backend/src/redirect.ts"),
      ...lambdaProps,
    });

    table.grantWriteData(createFn);
    table.grantReadData(redirectFn);

    // HTTP API Gateway
    const api = new apigw.HttpApi(this, "Api", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.GET],
        allowHeaders: ["content-type"],
      },
    });

    api.addRoutes({
      path: "/shorten",
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration("CreateInt", createFn),
    });

    api.addRoutes({
      path: "/{id}",
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration("RedirectInt", redirectFn),
    });

    // S3 + CloudFront for frontend
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "Cdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../frontend/dist"))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
    new cdk.CfnOutput(this, "SiteUrl", { value: `https://${distribution.domainName}` });
  }
}