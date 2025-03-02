
import React, { useState } from 'react';
import { UserStats } from '@/hooks/use-packet-simulation';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, CartesianGrid, Line } from "recharts";
import { formatDistanceToNow, formatDistance } from 'date-fns';

interface UserStatsProps {
  userStats: UserStats[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    `${secs}s`
  ].filter(Boolean).join(' ');
};

const UserStatsComponent: React.FC<UserStatsProps> = ({ userStats }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Prepare data for charts
  const trafficData = userStats.map(user => ({
    name: user.ip,
    sent: user.totalDataSent,
    received: user.totalDataReceived,
    total: user.totalDataSent + user.totalDataReceived
  }));
  
  // Flatten sessions data for website usage chart
  const websiteData = userStats.flatMap(user => 
    user.sessions.map(session => ({
      user: user.ip,
      website: session.site,
      duration: session.duration,
      sent: session.dataSent,
      received: session.dataReceived,
      total: session.dataSent + session.dataReceived
    }))
  ).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="h-[calc(100vh-230px)] rounded-md border border-border/30 bg-card/50 overflow-hidden">
      <Tabs defaultValue="overview" className="w-full h-full" onValueChange={setActiveTab}>
        <div className="flex items-center px-4 py-2 border-b border-border/30">
          <h3 className="text-sm font-medium mr-4">
            Network User Analysis
          </h3>
          <TabsList className="grid w-[400px] grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="websites">Website Usage</TabsTrigger>
            <TabsTrigger value="users">User Details</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="h-[calc(100%-45px)] mt-0 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Usage by User</CardTitle>
                <CardDescription>Total data sent and received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatBytes(value, 0)} />
                      <Tooltip 
                        formatter={(value: number) => formatBytes(value)} 
                        labelFormatter={(label) => `User: ${label}`}
                      />
                      <Bar dataKey="sent" name="Data Sent" fill="#3b82f6" />
                      <Bar dataKey="received" name="Data Received" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Websites</CardTitle>
                <CardDescription>By data usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={websiteData} 
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatBytes(value, 0)} />
                      <YAxis type="category" dataKey="website" width={150} />
                      <Tooltip 
                        formatter={(value: number) => formatBytes(value)} 
                        labelFormatter={(label) => `Website: ${label}`}
                      />
                      <Bar dataKey="total" name="Total Data" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Session Summary</CardTitle>
              <CardDescription>Active users on the network</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Session Duration</TableHead>
                    <TableHead>Data Sent</TableHead>
                    <TableHead>Data Received</TableHead>
                    <TableHead>Sites Visited</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">No user data available. Start scanning to capture user activity.</TableCell>
                    </TableRow>
                  ) : (
                    userStats.map((user) => (
                      <TableRow key={user.ip}>
                        <TableCell className="font-medium">{user.ip}</TableCell>
                        <TableCell>{formatDistanceToNow(user.firstSeen, { addSuffix: true })}</TableCell>
                        <TableCell>{formatDistanceToNow(user.lastSeen, { addSuffix: true })}</TableCell>
                        <TableCell>{formatDuration(user.sessionDuration)}</TableCell>
                        <TableCell>{formatBytes(user.totalDataSent)}</TableCell>
                        <TableCell>{formatBytes(user.totalDataReceived)}</TableCell>
                        <TableCell>{user.visitedSites.length}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="websites" className="h-[calc(100%-45px)] mt-0 p-4">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Website Usage Details</CardTitle>
              <CardDescription>Websites visited by users</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-360px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>First Visit</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Data Sent</TableHead>
                      <TableHead>Data Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userStats.flatMap(user => 
                      user.sessions.map(session => (
                        <TableRow key={`${user.ip}-${session.site}`}>
                          <TableCell className="font-medium">{user.ip}</TableCell>
                          <TableCell>{session.site}</TableCell>
                          <TableCell>{formatDistanceToNow(session.startTime, { addSuffix: true })}</TableCell>
                          <TableCell>{formatDistanceToNow(session.lastSeen, { addSuffix: true })}</TableCell>
                          <TableCell>{formatDuration(session.duration)}</TableCell>
                          <TableCell>{formatBytes(session.dataSent)}</TableCell>
                          <TableCell>{formatBytes(session.dataReceived)}</TableCell>
                        </TableRow>
                      ))
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">No website data available. Start scanning to capture website visits.</TableCell>
                      </TableRow>
                    ) : (
                      userStats.flatMap(user => 
                        user.sessions.map(session => (
                          <TableRow key={`${user.ip}-${session.site}`}>
                            <TableCell className="font-medium">{user.ip}</TableCell>
                            <TableCell>{session.site}</TableCell>
                            <TableCell>{formatDistanceToNow(session.startTime, { addSuffix: true })}</TableCell>
                            <TableCell>{formatDistanceToNow(session.lastSeen, { addSuffix: true })}</TableCell>
                            <TableCell>{formatDuration(session.duration)}</TableCell>
                            <TableCell>{formatBytes(session.dataSent)}</TableCell>
                            <TableCell>{formatBytes(session.dataReceived)}</TableCell>
                          </TableRow>
                        ))
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="h-[calc(100%-45px)] mt-0 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {userStats.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No user data available. Start scanning to capture user activity.
                </div>
              ) : (
                userStats.map(user => (
                  <Card key={user.ip} className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-center">
                        <span>{user.ip}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatBytes(user.totalDataSent + user.totalDataReceived)} total
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Active for {formatDuration(user.sessionDuration)} • 
                        First seen {formatDistanceToNow(user.firstSeen, { addSuffix: true })} •
                        Last active {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Visited Sites</h4>
                        <div className="flex flex-wrap gap-2">
                          {user.visitedSites.map(site => (
                            <Badge key={site} variant="secondary">{site}</Badge>
                          ))}
                          {user.visitedSites.length === 0 && (
                            <span className="text-sm text-muted-foreground">No sites detected</span>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-medium mb-2">Site Sessions</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Website</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Data Usage</TableHead>
                            <TableHead>Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.sessions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">No website sessions detected</TableCell>
                            </TableRow>
                          ) : (
                            user.sessions.map(session => (
                              <TableRow key={session.site}>
                                <TableCell className="font-medium">{session.site}</TableCell>
                                <TableCell>{formatDuration(session.duration)}</TableCell>
                                <TableCell>
                                  {formatBytes(session.dataSent + session.dataReceived)}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({formatBytes(session.dataSent)} sent, {formatBytes(session.dataReceived)} received)
                                  </span>
                                </TableCell>
                                <TableCell>{formatDistanceToNow(session.lastSeen, { addSuffix: true })}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserStatsComponent;
