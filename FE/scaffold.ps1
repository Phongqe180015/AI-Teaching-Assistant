$features = "auth", "users", "classes", "assignments", "submissions", "ai", "reports"
foreach ($f in $features) {
    New-Item -ItemType Directory -Force -Path "src/features/$f/components" | Out-Null
    New-Item -ItemType Directory -Force -Path "src/features/$f/services" | Out-Null
    New-Item -ItemType File -Force -Path "src/features/$f/index.ts" | Out-Null
}

$moves = @(
  @{ Src="src/index.css"; Dest="src/styles/index.css" },
  @{ Src="src/i18n.ts"; Dest="src/utils/i18n.ts" },
  @{ Src="src/services/aiService.ts"; Dest="src/features/ai/services/aiService.ts" },
  @{ Src="src/services/assignmentService.ts"; Dest="src/features/assignments/services/assignmentService.ts" },
  @{ Src="src/services/authService.ts"; Dest="src/features/auth/services/authService.ts" },
  @{ Src="src/services/classService.ts"; Dest="src/features/classes/services/classService.ts" },
  @{ Src="src/services/reportService.ts"; Dest="src/features/reports/services/reportService.ts" },
  @{ Src="src/services/submissionService.ts"; Dest="src/features/submissions/services/submissionService.ts" },
  @{ Src="src/services/userService.ts"; Dest="src/features/users/services/userService.ts" }
)

foreach ($m in $moves) {
  if (Test-Path $m.Src) {
    Move-Item -Path $m.Src -Destination $m.Dest -Force
  }
}

if (Test-Path "src/components/layout") {
    Get-ChildItem "src/components/layout" | Move-Item -Destination "src/layouts/" -Force
}
if (Test-Path "src/context") {
    Get-ChildItem "src/context" | Move-Item -Destination "src/store/" -Force
}
if (Test-Path "src/providers") {
    Get-ChildItem "src/providers" | Move-Item -Destination "src/store/" -Force
}
if (Test-Path "src/components/auth") {
    Get-ChildItem "src/components/auth" | Move-Item -Destination "src/features/auth/components/" -Force
}
