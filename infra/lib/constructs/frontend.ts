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

export interface FrontendProps {
  vpc: ec2.IVpc
  taskExecutionRole: iam.Role
  frontEcsSecurityGroup: ec2.SecurityGroup
}

export class Frontend extends Construct {
  public readonly service: ecs.FargateService

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id)

    const { vpc, taskExecutionRole, frontEcsSecurityGroup } = props

    const repository = new ecr.Repository(this, `${namePrefix}-front-ecr`, {
      repositoryName: `${namePrefix}-front-ecr`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteImages: true,
      imageScanOnPush: true,
    })

    const image = new DockerImageAsset(this, `${namePrefix}-front-ecr-image`, {
      assetName: `${namePrefix}-front-ecr-image`,
      directory: path.join(__dirname, '..', '..', '..', 'frontend'),
      file: path.join('infra', 'Dockerfile'),
      platform: Platform.LINUX_ARM64,
    })

    new ecrDeploy.ECRDeployment(this, `${namePrefix}-front-ecr-deploy`, {
      src: new ecrDeploy.DockerImageName(image.imageUri),
      dest: new ecrDeploy.DockerImageName(`${repository.repositoryUri}:latest`),
    })

    const role = new iam.Role(this, `${namePrefix}-ecs-task-front-role`, {
      roleName: `${namePrefix}-ecs-task-front-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    })

    const cluster = new ecs.Cluster(this, `${namePrefix}-front-cluster`, {
      clusterName: `${namePrefix}-front-cluster`,
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    })

    const taskDef = new ecs.FargateTaskDefinition(this, `${namePrefix}-front-task`, {
      family: `${namePrefix}-front-task`,
      executionRole: taskExecutionRole,
      taskRole: role,
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    })
    const logGroup = new logs.LogGroup(this, `${namePrefix}-front-log`, {
      logGroupName: `/ecs/${namePrefix}-front-log`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    taskDef.addContainer(`${namePrefix}-front-container`, {
      containerName: `${namePrefix}-front-container`,
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'],
        interval: Duration.seconds(10),
        timeout: Duration.seconds(10),
        retries: 3,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs',
        logGroup: logGroup,
      }),
    })

    this.service = new ecs.FargateService(this, `${namePrefix}-front-service`, {
      serviceName: `${namePrefix}-front-service`,
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
      securityGroups: [frontEcsSecurityGroup],
    })
  }
}
