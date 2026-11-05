/** Inbox categories: Important / Promotions / Junk. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyEmail, categoryCounts, senderKey } from '../src/lib/mailCategory.js'

const mail = (from, subject, snippet = '', extra = {}) => ({ from, subject, snippet, ...extra })
const cat = (email, rules) => classifyEmail(email, rules).category

test('security, verification and account mail is always important', () => {
  assert.equal(cat(mail('BetaList <team@betalist.com>', 'Verify your email')), 'important')
  assert.equal(cat(mail('Revleads <noreply@revleads.com>', 'Action required: Complete your Nexora application')), 'important')
  assert.equal(cat(mail('Google <no-reply@accounts.google.com>', 'Security alert')), 'important')
  assert.equal(cat(mail('Paddle <help@paddle.com>', 'Your application was rejected')), 'important')
})

test('upsells and newsletters are promotions', () => {
  assert.equal(cat(mail('BetaList <team@betalist.com>', 'Complete your payment to launch')), 'promo')
  assert.equal(cat(mail('Acme <news@acme.io>', 'What is new this month')), 'promo')
  assert.equal(cat(mail('Shop <hello@shop.com>', '50% off everything this weekend')), 'promo')
  assert.equal(cat(mail('Tool <noreply@tool.com>', 'Your weekly summary')), 'promo')
})

test('cold outreach and spam are junk', () => {
  assert.equal(cat(mail('SmolShow <hi@smolshow.com>', 'showcasing the story behind your brand')), 'junk')
  assert.equal(cat(mail('Ali <ali@seoagency.pk>', 'SEO services package for your website, rank on Google')), 'junk')
  assert.equal(cat(mail('x <x@y.com>', 'Dear Sir, I noticed your website needs help')), 'junk')
})

test('a real customer mail is never hidden', () => {
  assert.equal(cat(mail('Ahmed <ahmed@gmail.com>', 'Need a demo of your restaurant POS')), 'important')
  assert.equal(cat(mail('Sara <sara@school.edu.pk>', 'Fees module question', 'Hello, we use your school ERP')), 'important')
})

test('urgent tickets, replies and conversations stay important even from bulk-looking senders', () => {
  assert.equal(cat(mail('x <noreply@x.com>', '50% off', '', { ticket: { priority: 'urgent' } })), 'important')
  assert.equal(cat(mail('x <news@x.com>', 'Re: your order')), 'important')
  assert.equal(cat(mail('x <news@x.com>', 'Weekly digest', '', { ticket: { priority: 'normal', count: 3 } })), 'important')
})

test('a sender the owner moved follows that choice', () => {
  const email = mail('Ahmed <ahmed@gmail.com>', 'Hello')
  assert.equal(cat(email, { 'ahmed@gmail.com': 'junk' }), 'junk')
  assert.equal(senderKey('Ahmed <Ahmed@Gmail.com>'), 'ahmed@gmail.com')
})

test('counts split unread per category', () => {
  const items = [
    mail('a <a@gmail.com>', 'Hi', '', { state: { isRead: false } }),
    mail('n <news@n.com>', 'Newsletter', '', { state: { isRead: true } }),
    mail('j <j@j.com>', 'Dear Sir', '', { state: { isRead: false } }),
  ]
  const c = categoryCounts(items)
  assert.deepEqual([c.important, c.promo, c.junk], [1, 1, 1])
  assert.deepEqual(c.unread, { important: 1, promo: 0, junk: 1 })
})
