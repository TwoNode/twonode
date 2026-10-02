"use client";

import React from "react";
import { AlertTriangle, XCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showHomeButton?: boolean;
}

export function PlanDetailsErrorState({
  title = "Failed to Load Plan",
  message = "We couldn't load the plan details. This might be due to a network issue or the plan may not exist.",
  onRetry,
  onGoBack,
  showHomeButton = false,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Error Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              {onGoBack && (
                <Button onClick={onGoBack} variant="outline" className="flex-1">
                  Go Back
                </Button>
              )}
              {showHomeButton && (
                <Button
                  onClick={() =>
                    (window.location.href = "/surfboard/dashboard")
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlanFormErrorState({
  title = "Failed to Load Form",
  message = "We couldn't load the form data. Please try again or contact support if the issue persists.",
  onRetry,
  onGoBack,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Error Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              {onGoBack && (
                <Button onClick={onGoBack} variant="outline" className="flex-1">
                  Go Back
                </Button>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function GenericErrorState({
  title = "Something Went Wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  icon: Icon = AlertTriangle,
}: ErrorStateProps & { icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotFoundState({
  title = "Not Found",
  message = "The item you're looking for doesn't exist or has been removed.",
  onGoBack,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
            <span className="text-5xl font-bold text-gray-400 dark:text-gray-500">
              404
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onGoBack && (
            <Button onClick={onGoBack} variant="outline">
              Go Back
            </Button>
          )}
          <Button
            onClick={() => (window.location.href = "/surfboard/dashboard")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
