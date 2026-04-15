import { test, expect } from '@playwright/test'

test.describe('Data Seeding (Teacher)', () => {
  test.skip(() => test.info().project.name !== 'teacher', 'Only run for teacher')

  test('Seed Course & Assignment & Announcement', async ({ page }) => {
    test.setTimeout(120000)

    console.log('1. Go to Courses')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(3000)

    console.log('Clicking Create Course')
    // Just click whatever button has "Buat Materi" text forcefully
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => b.textContent?.includes('Buat Materi'))
      if (btn) btn.click()
    })

    await page.waitForTimeout(2000)
    console.log('Filling course title')
    await page.evaluate(() => {
      const input = document.querySelector('form input[type="text"]') as HTMLInputElement
      if (input) {
        input.value = 'Seed Course Automation'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })

    console.log('Submitting course form')
    await page.evaluate(() => {
      const btn = document.querySelector('form button[type="submit"]') as HTMLButtonElement
      if (btn) btn.click()
    })

    console.log('Waiting for URL')
    await page.waitForTimeout(3000)

    console.log('2. Go to Assignments')
    await page.goto('/#/app/assignments')
    await page.waitForTimeout(3000)

    console.log('Clicking Create Assignment')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find(
        (b) => b.textContent?.includes('Tugas Baru') || b.textContent?.includes('Tambah Tugas')
      )
      if (btn) btn.click()
    })

    await page.waitForTimeout(2000)

    console.log('Filling Assignment inputs')
    await page.evaluate(() => {
      const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement
      if (titleInput) {
        titleInput.value = 'Tugas Seed Automation'
        titleInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const descInput = document.querySelector('textarea') as HTMLTextAreaElement
      if (descInput) {
        descInput.value = 'Kerjakan tugas ini sebagai bagian dari data seeding automation.'
        descInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const gradeInput = document.querySelector('input[type="number"]') as HTMLInputElement
      if (gradeInput) {
        gradeInput.value = '100'
        gradeInput.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const submitBtns = Array.from(document.querySelectorAll('button'))
      const submitBtn = submitBtns.find((b) => b.textContent?.includes('Tugaskan'))
      if (submitBtn) submitBtn.click()
    })

    await page.waitForTimeout(3000)

    console.log('3. Go to Announcements')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(3000)

    console.log('Clicking Create Announcement')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find((b) => b.textContent?.includes('Buat Pengumuman'))
      if (btn) btn.click()
    })

    await page.waitForTimeout(2000)

    console.log('Filling Announcement inputs')
    await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input[type="text"]')
      ) as HTMLInputElement[]
      const titleInput = inputs.length > 1 ? inputs[1] : inputs[0]
      if (titleInput) {
        titleInput.value = 'Pengumuman Seed'
        titleInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const descInput = document.querySelector('textarea') as HTMLTextAreaElement
      if (descInput) {
        descInput.value = 'Selamat datang di EduSync LMS! Ini adalah pengumuman otomatis.'
        descInput.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const submitBtns = Array.from(document.querySelectorAll('button'))
      const submitBtn = submitBtns.find(
        (b) => b.textContent?.includes('Terbitkan') || b.textContent?.includes('Publikasikan')
      )
      if (submitBtn) submitBtn.click()
    })

    await page.waitForTimeout(3000)

    console.log('Seeding Teacher Done')
  })
})

test.describe('Data Seeding (Student)', () => {
  test.skip(() => test.info().project.name !== 'student', 'Only run for student')

  test('Seed Forum Post', async ({ page }) => {
    test.setTimeout(60000)
    console.log('1. Go to Forum')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(3000)

    console.log('Filling Forum inputs')
    await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input[type="text"]')
      ) as HTMLInputElement[]
      const titleInput = inputs.find((i) => i.placeholder?.includes('Judul pertanyaan'))
      if (titleInput) {
        titleInput.value = 'Pertanyaan dari Automation Seed'
        titleInput.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const descInput = document.querySelector('textarea') as HTMLTextAreaElement
      if (descInput && descInput.placeholder?.includes('Jelaskan pertanyaanmu')) {
        descInput.value = 'Bagaimana cara belajar menggunakan EduSync? Thanks!'
        descInput.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const btns = Array.from(document.querySelectorAll('button'))
      const submitBtn = btns.find((b) => b.textContent?.includes('Posting Pertanyaan'))
      if (submitBtn) submitBtn.click()
    })

    await page.waitForTimeout(3000)
    console.log('Seeding Student Done')
  })
})
