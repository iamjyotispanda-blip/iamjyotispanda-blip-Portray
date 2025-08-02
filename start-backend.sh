#!/bin/bash
echo "Starting PortRay .NET Core Backend..."
cd backend
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export ASPNETCORE_ENVIRONMENT=Development
dotnet run --urls http://0.0.0.0:5001