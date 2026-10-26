!macro customInit
  DetailPrint "Ensuring existing SecurityEye processes are closed..."
  nsExec::Exec 'taskkill /F /IM SecurityEye.exe /T'
  nsExec::Exec 'taskkill /F /IM llama-server.exe /T'
  Sleep 1000
!macroend

!macro customUnInit
  DetailPrint "Ensuring existing SecurityEye processes are closed before uninstall..."
  nsExec::Exec 'taskkill /F /IM SecurityEye.exe /T'
  nsExec::Exec 'taskkill /F /IM llama-server.exe /T'
  Sleep 1000
!macroend
