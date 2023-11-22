import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { namePrefix } from '../utils'

export interface EndpointProps {
  vpc: ec2.IVpc
  vpcEndpointSecurityGroup: ec2.SecurityGroup
}

export class Endpoint extends Construct {
  constructor(scope: Construct, id: string, props: EndpointProps) {
    super(scope, id)

    const { vpc, vpcEndpointSecurityGroup } = props

    vpc.addGatewayEndpoint(`${namePrefix}-S3-gw-ep`, {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: vpc.privateSubnets }],
    })
    vpc.addInterfaceEndpoint(`${namePrefix}-ecr-api-ep`, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnets: vpc.privateSubnets },
      securityGroups: [vpcEndpointSecurityGroup],
    })
    vpc.addInterfaceEndpoint(`${namePrefix}-ecr-dkr-ep`, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnets: vpc.privateSubnets },
      securityGroups: [vpcEndpointSecurityGroup],
    })
    vpc.addInterfaceEndpoint(`${namePrefix}-logs-ep`, {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnets: vpc.privateSubnets },
      securityGroups: [vpcEndpointSecurityGroup],
    })
    vpc.addInterfaceEndpoint(`${namePrefix}-bedrock-runtime-ep`, {
      service: new ec2.InterfaceVpcEndpointAwsService('bedrock-runtime'),
      subnets: { subnets: vpc.privateSubnets },
      securityGroups: [vpcEndpointSecurityGroup],
    })
  }
}
