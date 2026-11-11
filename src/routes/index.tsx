import { createFileRoute } from "@tanstack/react-router";
import { CityApp } from "@/components/city-app";

export const Route = createFileRoute("/")({ component: CityApp });

