import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { CfnInternetGateway } from 'aws-cdk-lib/aws-ec2'
import { Tags } from 'aws-cdk-lib'
import { namePrefix } from '../utils'

export class Network extends Construct {
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string) {
    super(scope, id)

    const vpc = new ec2.Vpc(this, `${namePrefix}-vpc`, {
      vpcName: `${namePrefix}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('172.16.0.0/16'),
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    })

    vpc.publicSubnets.forEach((subnet, index) => {
      const no = index + 1
      Tags.of(subnet).add('Name', `${namePrefix}-public-subnet-${no}`)

      const rtb = subnet.node.findChild('RouteTable') as ec2.CfnRouteTable
      Tags.of(rtb).add('Name', `${namePrefix}-public-rtb-${no}-rtb`)
    })
    vpc.privateSubnets.forEach((subnet, index) => {
      const no = index + 1
      Tags.of(subnet).add('Name', `${namePrefix}-private-subnet-${no}`)

      const rtb = subnet.node.findChild('RouteTable') as ec2.CfnRouteTable
      Tags.of(rtb).add('Name', `${namePrefix}-private-rtb-${no}-rtb`)
    })

    const igw = vpc.node.findChild('IGW') as CfnInternetGateway
    Tags.of(igw).add('Name', `${namePrefix}-igw`)

    this.vpc = vpc
  }
}
