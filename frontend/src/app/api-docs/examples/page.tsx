'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EndpointExample {
  title: string;
  description: string;
  method: 'GET' | 'POST';
  path: string;
  request: string;
  response: string;
}

const networkExamples: EndpointExample[] = [
  {
    title: 'Get Current Network Info',
    description: 'Retrieve information about the currently connected Stellar network',
    method: 'GET',
    path: '/api/network/info',
    request: `curl -X GET "https://api.stellarinsights.io/api/network/info" \\
  -H "Content-Type: application/json"`,
    response: `{
  "network": "mainnet",
  "display_name": "Stellar Mainnet",
  "rpc_url": "https://horizon.stellar.org",
  "horizon_url": "https://horizon.stellar.org",
  "network_passphrase": "Public Global Stellar Network ; September 2015",
  "color": "#00B0FF",
  "is_mainnet": true,
  "is_testnet": false
}`
  },
  {
    title: 'Get Available Networks',
    description: 'List all available Stellar networks you can connect to',
    method: 'GET',
    path: '/api/network/available',
    request: `curl -X GET "https://api.stellarinsights.io/api/network/available" \\
  -H "Content-Type: application/json"`,
    response: `[
  {
    "network": "mainnet",
    "display_name": "Stellar Mainnet",
    "rpc_url": "https://horizon.stellar.org",
    "horizon_url": "https://horizon.stellar.org",
    "network_passphrase": "Public Global Stellar Network ; September 2015",
    "color": "#00B0FF",
    "is_mainnet": true,
    "is_testnet": false
  },
  {
    "network": "testnet",
    "display_name": "Stellar Testnet",
    "rpc_url": "https://horizon-testnet.stellar.org",
    "horizon_url": "https://horizon-testnet.stellar.org",
    "network_passphrase": "Test SDF Network ; September 2015",
    "color": "#7C4DFF",
    "is_mainnet": false,
    "is_testnet": true
  }
]`
  },
  {
    title: 'Switch Network',
    description: 'Switch to a different Stellar network (requires server restart)',
    method: 'POST',
    path: '/api/network/switch',
    request: `curl -X POST "https://api.stellarinsights.io/api/network/switch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "network": "testnet"
  }'`,
    response: `{
  "success": false,
  "message": "Network switch to Stellar Testnet requested. Server restart required to apply changes.",
  "network_info": {
    "network": "testnet",
    "display_name": "Stellar Testnet",
    "rpc_url": "https://horizon-testnet.stellar.org",
    "horizon_url": "https://horizon-testnet.stellar.org",
    "network_passphrase": "Test SDF Network ; September 2015",
    "color": "#7C4DFF",
    "is_mainnet": false,
    "is_testnet": true
  }
}`
  }
];

const sorobanExamples: EndpointExample[] = [
  {
    title: 'Get Verification Summary',
    description: 'Get a summary of the latest contract verification statuses',
    method: 'GET',
    path: '/api/analytics/verification-summary',
    request: `curl -X GET "https://api.stellarinsights.io/api/analytics/verification-summary" \\
  -H "Content-Type: application/json"`,
    response: `{
  "latestEpoch": 12345,
  "latestStatus": "verified",
  "latestHash": "0xabc123def...",
  "latestLedger": 42000000,
  "latestSubmitted": "2024-01-01T12:00:00Z",
  "auditTrail": [
    {
      "epoch": 12345,
      "verification_status": "verified",
      "hash": "0xabc123def...",
      "ledger": 42000000,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}`
  },
  {
    title: 'List Contract Events',
    description: 'Query contract events from the network',
    method: 'GET',
    path: '/api/analytics/contract-events',
    request: `curl -X GET "https://api.stellarinsights.io/api/analytics/contract-events?limit=10&offset=0" \\
  -H "Content-Type: application/json"`,
    response: `[
  {
    "id": "evt_123",
    "event_type": "verification",
    "verification_status": "success",
    "ledger": 42000000,
    "timestamp": "2024-01-01T12:00:00Z",
    "data": {}
  }
]`
  },
  {
    title: 'Get Event Statistics',
    description: 'Get statistics about contract events',
    method: 'GET',
    path: '/api/analytics/event-stats',
    request: `curl -X GET "https://api.stellarinsights.io/api/analytics/event-stats" \\
  -H "Content-Type: application/json"`,
    response: `{
  "totalEvents": 1000,
  "verified": 900,
  "pending": 50,
  "failed": 50
}`
  }
];

const walletExamples: EndpointExample[] = [
  {
    title: 'SEP-10 Challenge',
    description: 'Get a SEP-10 challenge transaction for authentication',
    method: 'GET',
    path: '/api/sep10/challenge',
    request: `curl -X GET "https://api.stellarinsights.io/api/sep10/challenge?account=GABC...XYZ" \\
  -H "Content-Type: application/json"`,
    response: `{
  "transaction": "AAAAAgAAAABc...",
  "network_passphrase": "Public Global Stellar Network ; September 2015"
}`
  },
  {
    title: 'Submit SEP-10 Response',
    description: 'Submit a signed SEP-10 challenge transaction to get a JWT',
    method: 'POST',
    path: '/api/sep10/token',
    request: `curl -X POST "https://api.stellarinsights.io/api/sep10/token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transaction": "AAAAAgAAAABc..."
  }'`,
    response: `{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}`
  }
];

const rankingsExamples: EndpointExample[] = [
  {
    title: 'Get Anchors List',
    description: 'Get a list of all anchors with their metrics and rankings',
    method: 'GET',
    path: '/api/anchors',
    request: `curl -X GET "https://api.stellarinsights.io/api/anchors?limit=10&offset=0" \\
  -H "Content-Type: application/json"`,
    response: `{
  "anchors": [
    {
      "id": "anchor_1",
      "name": "Example Anchor",
      "stellar_account": "GABC...XYZ",
      "reliability_score": 98.5,
      "asset_coverage": 10,
      "failure_rate": 1.5,
      "total_transactions": 100000,
      "successful_transactions": 98500,
      "failed_transactions": 1500,
      "status": "online"
    }
  ],
  "total": 50
}`
  },
  {
    title: 'Get Anchor Details',
    description: 'Get detailed information about a specific anchor',
    method: 'GET',
    path: '/api/anchors/:id',
    request: `curl -X GET "https://api.stellarinsights.io/api/anchors/anchor_1" \\
  -H "Content-Type: application/json"`,
    response: `{
  "anchor": {
    "id": "anchor_1",
    "name": "Example Anchor",
    "stellar_account": "GABC...XYZ",
    "reliability_score": 98.5,
    "asset_coverage": 10,
    "failure_rate": 1.5,
    "total_transactions": 100000,
    "successful_transactions": 98500,
    "failed_transactions": 1500,
    "status": "online"
  },
  "issued_assets": [
    {
      "asset_code": "USD",
      "issuer": "GABC...XYZ",
      "volume_24h_usd": 1000000,
      "success_rate": 99,
      "failure_rate": 1,
      "total_transactions": 50000
    }
  ],
  "reliability_history": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "score": 98.5
    }
  ]
}`
  },
  {
    title: 'Get Corridors List',
    description: 'Get a list of payment corridors with performance rankings',
    method: 'GET',
    path: '/api/corridors',
    request: `curl -X GET "https://api.stellarinsights.io/api/corridors?limit=10&offset=0" \\
  -H "Content-Type: application/json"`,
    response: `{
  "corridors": [
    {
      "id": "corridor_1",
      "source_asset": "USD:GABC...XYZ",
      "destination_asset": "EUR:GDEF...UVW",
      "liquidity_depth_usd": 1000000,
      "volume_24h_usd": 500000,
      "success_rate": 98.5,
      "average_slippage_bps": 10,
      "status": "online"
    }
  ],
  "total": 200
}`
  }
];

const ExampleSection = ({ 
  title, 
  examples 
}: { 
  title: string; 
  examples: EndpointExample[] 
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-4">
        {examples.map((example, index) => (
          <EndpointCard key={index} example={example} />
        ))}
      </div>
    </div>
  );
};

const EndpointCard = ({ example }: { example: EndpointExample }) => {
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleCopy = async (text: string, type: 'request' | 'response') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'request') {
        setCopiedRequest(true);
        setTimeout(() => setCopiedRequest(false), 2000);
      } else {
        setCopiedResponse(true);
        setTimeout(() => setCopiedResponse(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-4">
          <span className={cn(
            "px-2 py-1 text-xs font-bold rounded",
            example.method === 'GET' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          )}>
            {example.method}
          </span>
          <CardTitle>{example.title}</CardTitle>
        </div>
        <CardDescription>{example.description}</CardDescription>
        <div className="mt-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
          {example.path}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span className="font-medium">Request</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(example.request, 'request')}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copiedRequest ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto text-xs">
            {example.request}
          </pre>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span className="font-medium">Response</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(example.response, 'response')}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copiedResponse ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto text-xs">
            {example.response}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

const CodeExamples = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">API Code Examples</h1>
        <p className="text-muted-foreground dark:text-gray-300">
          Run and copy code examples for the Stellar Analysis API
        </p>
      </div>

      <ExampleSection title="Network Endpoints" examples={networkExamples} />
      <ExampleSection title="Soroban Endpoints" examples={sorobanExamples} />
      <ExampleSection title="Wallet & Authentication Endpoints" examples={walletExamples} />
      <ExampleSection title="Rankings & Listings Endpoints" examples={rankingsExamples} />
    </div>
  );
};

export default CodeExamples;
