<script setup lang="ts">
import * as d3 from 'd3'
import type { BarPlotData } from '~/lib/topbar';

const props = defineProps<{ data: BarPlotData[] }>()

const chartRef = ref<HTMLElement | null>(null)

const { isDark } = globalTheme();

const style = computed<{ fontColor: string, tagColor: string, barColor: string }>(() => {
  return isDark.value ?
    { fontColor: "white", tagColor: "var(--color-orange-600)", barColor: "white" }
    : { fontColor: "black", tagColor: "var(--color-orange-400)", barColor: "black" }
})

const drawChart = () => {
  if (!chartRef.value) return

  // Styling
  const { fontColor, tagColor, barColor } = style.value

  // 1. 清空旧图表
  d3.select(chartRef.value).selectAll('*').remove()

  // 2. 设置画布尺寸
  const margin = {
    top: 40, right: 80, bottom: 20,
    left: 10 * (d3.max(props.data.map(a => a.label.length)) ?? 1)
  }
  const width = chartRef.value.clientWidth - margin.left - margin.right
  const height = (props.data.length * 40) // 根据数据量动态高度

  const svg = d3.select(chartRef.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  // 3. 设置比例尺
  const x = d3.scaleLinear()
    .domain([0, d3.max(props.data, d => d.value) || 0])
    .range([0, width])

  const y = d3.scaleBand()
    .domain(props.data.map(d => d.label))
    .range([0, height])
    .padding(0.2)

  // 4. 绘制 X 轴 (放在顶部)
  svg.append('g')
    .attr('class', 'x-axis')
    .call(d3.axisTop(x).ticks(5).tickSizeOuter(0))
    .style('color', fontColor)

  // 5. 绘制 Y 轴 (放在左侧)
  svg.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .style('color', tagColor)
    .selectAll('text')
    .style('font-size', "0.9rem")
    .style("font-weight", "bold")

  // 6. 绘制柱状图
  svg.selectAll('.bar')
    .data(props.data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('y', d => y(d.label)!)
    .attr('x', 0)
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.value))
    .attr('fill', 'none') // or transparent for interaction
    .attr("stroke-width", 2)
    .attr("stroke", barColor)
    .attr('rx', 4) // 圆角
    .style('transition', 'all 0.3s ease')

  // 7. (可选) 添加数值标签在柱体末端
  svg.selectAll('.label')
    .data(props.data)
    .enter()
    .append('text')
    .attr('x', d => x(d.value) + 5)
    .attr('y', d => y(d.label)! + y.bandwidth() / 2)
    .attr('dy', '.35em')
    .text(d => d.value)
    .style('font-size', "0.8rem")
    .style('fill', fontColor)
}

// 监听数据和窗口变化
onMounted(() => {
  drawChart()
  window.addEventListener('resize', drawChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', drawChart)
})

watch(() => props.data, drawChart, { deep: true })
</script>

<template>
  <div ref="chartRef" class="w-full min-h-[200px]" />
</template>

<style scoped>
/* 可以进一步通过 CSS 控制轴线样式，使其更符合 Nuxt UI 风格 */
:deep(.domain) {
  stroke: var(--ui-border);
}

:deep(.tick line) {
  stroke: var(--ui-border);
}
</style>
