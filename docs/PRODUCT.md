# ThereYouGo

## Problem

People often remember what they need when they cannot get it, then forget when they reach a relevant place.

## Product promise

ThereYouGo lets a user record what they need and reminds them when getting it becomes relevant. The system should infer where and when without requiring location setup.

## Canonical example

A user adds “Cortisone cream” at home. Later, they visit Target for chicken. ThereYouGo recognizes that Target likely sells cortisone cream, determines that the user is visiting rather than passing by, and reminds them:

> There you go 👀  
> Don’t forget the cortisone cream.

## Core UX philosophy

```text
USER PROVIDES WHAT
        ↓
APP DETERMINES WHERE
        ↓
APP DETERMINES WHEN
        ↓
USEFUL REMINDER
```

The primary experience should be: add something, forget about it, and receive a reminder at a useful moment.

## Deliberately not

ThereYouGo is not a map application, geofence manager, or complex productivity tool. The intended product does not ask users to choose stores, locations, radiuses, geofences, reminder types, or categories.
