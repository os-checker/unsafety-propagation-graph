
export default function () {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === "dark");

  const shikiLight = "github-light";
  const shikiDark = "github-dark";

  const shikiThemes = { light: shikiLight, dark: shikiDark, };
  // const shikiTheme = computed(() => isDark.value ? shikiDark : shikiLight);
  return { isDark, shikiThemes, shikiLight, shikiDark }
}
