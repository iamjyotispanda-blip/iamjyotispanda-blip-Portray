#!/bin/bash
cd backend
export DOTNET_CLI_TELEMETRY_OPTOUT=1
dotnet run --urls http://0.0.0.0:5001