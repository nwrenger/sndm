; ModuleID = 'probe11.c0d1107140d5cf7c-cgu.0'
source_filename = "probe11.c0d1107140d5cf7c-cgu.0"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

; probe11::probe
; Function Attrs: nonlazybind uwtable
define void @_ZN7probe115probe17h5b3ea41431df3517E() unnamed_addr #0 {
start:
  ret void
}

attributes #0 = { nonlazybind uwtable "probe-stack"="inline-asm" "target-cpu"="x86-64" }

!llvm.module.flags = !{!0, !1}

!0 = !{i32 8, !"PIC Level", i32 2}
!1 = !{i32 2, !"RtLibUseGOT", i32 1}