import * as path from 'path'
import { Construct } from 'constructs'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as ecrDeploy from 'cdk-ecr-deployment'
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets'
import { namePrefix } from '../utils'

interface WebsocketProps {
  vpc: ec2.IVpc
  taskExecutionRole: iam.Role
  webSocketEcsSecurityGroup: ec2.SecurityGroup
}

export class WebSocket extends Construct {
  public readonly service: ecs.FargateService

  constructor(scope: Construct, id: string, props: WebsocketProps) {
    super(scope, id)

    const { vpc, taskExecutionRole, webSocketEcsSecurityGroup } = props

    const repository = new ecr.Repository(this, `${namePrefix}-websocket-ecr`, {
      repositoryName: `${namePrefix}-websocket-ecr`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteImages: true,
      imageScanOnPush: true,
    })

    const image = new DockerImageAsset(this, `${namePrefix}-websocket-ecr-image`, {
      assetName: `${namePrefix}-websocket-ecr-image`,
      directory: path.join(__dirname, '..', '..', '..', 'backend-websocket'),
      file: path.join('infra', 'Dockerfile'),
      platform: Platform.LINUX_ARM64,
    })

    new ecrDeploy.ECRDeployment(this, `${namePrefix}-websocket-ecr-deploy`, {
      src: new ecrDeploy.DockerImageName(image.imageUri),
      dest: new ecrDeploy.DockerImageName(`${repository.repositoryUri}:latest`),
    })

    const role = new iam.Role(this, `${namePrefix}-ecs-task-websocket-role`, {
      roleName: `${namePrefix}-ecs-task-websocket-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    })
    role.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['bedrock:*'],
      }),
    )
    const cluster = new ecs.Cluster(this, `${namePrefix}-websocket-cluster`, {
      clusterName: `${namePrefix}-websocket-cluster`,
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    })

    const taskDef = new ecs.FargateTaskDefinition(this, `${namePrefix}-websocket-task`, {
      family: `${namePrefix}-websocket-task`,
      executionRole: taskExecutionRole,
      taskRole: role,
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    })
    const logGroup = new logs.LogGroup(this, `${namePrefix}-websocket-log`, {
      logGroupName: `/ecs/${namePrefix}-websocket-log`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    taskDef.addContainer(`${namePrefix}-websocket-container`, {
      containerName: `${namePrefix}-websocket-container`,
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      portMappings: [
        {
          containerPort: 8080,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 8081,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8081/ || exit 1'],
        interval: Duration.seconds(10),
        timeout: Duration.seconds(10),
        retries: 3,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs',
        logGroup: logGroup,
      }),
    })

    this.service = new ecs.FargateService(this, `${namePrefix}-websocket-service`, {
      serviceName: `${namePrefix}-websocket-service`,
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: {
        rollback: true,
      },
      securityGroups: [webSocketEcsSecurityGroup],
    })
  }
}
