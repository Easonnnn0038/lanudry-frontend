import { nextTick, onMounted, onUnmounted, ref } from 'vue'

export function useScannerFocus(inputRef, enabled = () => true) {
  const focused = ref(false)
  const focus = async () => {
    if (!enabled()) return
    await nextTick()
    inputRef.value?.focus()
  }
  const onFocus = () => { focused.value = true }
  const onBlur = event => {
    focused.value = false
    if (!event?.relatedTarget || event.relatedTarget === document.body) setTimeout(focus, 120)
  }
  const onWindowFocus = () => focus()
  onMounted(() => { window.addEventListener('focus', onWindowFocus); focus() })
  onUnmounted(() => window.removeEventListener('focus', onWindowFocus))
  return { focused, focus, onFocus, onBlur }
}
