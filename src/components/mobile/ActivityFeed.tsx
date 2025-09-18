import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, MessageCircle, Wrench, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'payment' | 'message' | 'maintenance' | 'document';
  title: string;
  description: string;
  date: string;
  status?: 'completed' | 'pending' | 'overdue';
  amount?: number;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

const ActivityFeed = ({ activities, className }: ActivityFeedProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return CreditCard;
      case 'message':
        return MessageCircle;
      case 'maintenance':
        return Wrench;
      case 'document':
        return FileText;
      default:
        return FileText;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'overdue':
        return 'bg-overdue/10 text-overdue border-overdue/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No recent activity</h3>
          <p className="text-sm text-muted-foreground">
            Your recent payments, messages, and updates will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {activities.map((activity) => {
        const Icon = getIcon(activity.type);
        
        return (
          <Card key={activity.id} className="border-l-4 border-l-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    {activity.status && (
                      <Badge variant="outline" className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                    
                    {activity.amount && (
                      <span className="font-medium text-sm">
                        ${activity.amount.toLocaleString()}
                      </span>
                    )}
                    
                    {activity.type === 'document' && (
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ActivityFeed;