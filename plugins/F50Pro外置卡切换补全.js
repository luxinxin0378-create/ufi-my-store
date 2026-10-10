// <script>
(async () => {
    const simCardEl = document.querySelector('#SIM_CARD_TYPE')
    const outSim1 = document.createElement("option")
    const outSim2 = document.createElement("option")
    outSim1.textContent = "外置1"
    outSim2.textContent = "外置2"
    outSim1.value = 11
    outSim2.value = 12
    simCardEl.appendChild(outSim1)
    simCardEl.appendChild(outSim2)
})()
// </script>