<template>
  <div class="receive-wrapper">
    <!-- ============= 顶部步骤条 ============= -->
    <div class="steps-bar">
      <el-steps :active="currentStep" align-center finish-status="success" process-status="process">
        <el-step
          v-for="(s, i) in stepList"
          :key="i"
          :title="s.title"
          :icon="s.icon"
          :status="i < currentStep ? 'success' : (i === currentStep ? 'process' : 'wait')"
          :class="{ clickable: i <= maxReachedStep }"
          @click.native="onStepClick(i)"
        />
      </el-steps>
    </div>

    <!-- ============= 步骤内容区 ============= -->
    <div class="step-content">

      <!-- ===== Step 0: 客户信息 ===== -->
      <div v-show="currentStep === 0" class="step-panel step-customer">
        <div class="card-box">
          <div class="card-title">
            <el-icon :size="18"><User /></el-icon>
            <span>客户信息</span>
            <el-tag v-if="isNewCustomer" type="success" size="small" effect="plain">新客户</el-tag>
            <el-tag v-else-if="custForm.phone" type="info" size="small" effect="plain">老客户</el-tag>
          </div>

          <el-form :model="custForm" label-width="80px" size="large" @submit.prevent="onSearchCustomer">
            <el-form-item label="手机号" class="phone-item">
              <el-input
                v-model="custForm.phone"
                placeholder="输入11位手机号后回车查询"
                maxlength="11"
                clearable
                @keyup.enter="onSearchCustomer"
                @blur="onPhoneBlur"
              >
                <template #append>
                  <el-button :icon="Search" type="primary" @click="onSearchCustomer">查询</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="custForm.name" placeholder="请输入姓名" maxlength="20" />
            </el-form-item>
            <el-form-item label="地址">
              <el-input v-model="custForm.address" placeholder="小区/栋/门牌号（可选）" maxlength="100" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="custForm.remark" type="textarea" :rows="2" maxlength="100" placeholder="客户特殊标记（可选）" />
            </el-form-item>
          </el-form>

          <div v-if="customerDetail" class="customer-stats">
            <span>累计 <b>{{ customerDetail.totalCount }}</b> 件</span>
            <span class="divider">|</span>
            <span>累计 <b>¥{{ fmt(customerDetail.totalAmount) }}</b></span>
          </div>
        </div>
      </div>

      <!-- ===== Step 1: 会员卡 ===== -->
      <div v-show="currentStep === 1" class="step-panel step-card">
        <div class="card-box member-card-box">
          <div class="card-title">
            <el-icon :size="18"><CreditCard /></el-icon>
            <span>会员卡</span>
            <el-tooltip
              v-if="!currentCard && form.newCardFlag !== 1"
              content="请先勾选下方「收衣同时办卡」"
              placement="top"
            >
              <el-button type="primary" link class="ml-auto" disabled>
                <el-icon><Plus /></el-icon>办卡
              </el-button>
            </el-tooltip>
            <el-button v-else-if="!currentCard && form.newCardFlag === 1" type="primary" link class="ml-auto" @click="openCreateCard">
              <el-icon><Plus /></el-icon>办卡
            </el-button>
          </div>

          <div v-if="currentCard" class="mc-box">
            <div class="mc-header">
              <div>
                <div class="mc-no">{{ currentCard.cardNo }}</div>
                <div class="mc-type">
                  <el-tag type="warning" size="small">{{ currentCard.cardTypeName }}</el-tag>
                  <span class="mc-rate">折扣 {{ currentCard.discountRate }} 折</span>
                </div>
              </div>
              <div class="mc-balance">
                <div class="label">余额</div>
                <div class="value">¥{{ fmt(currentCard.balance) }}</div>
              </div>
            </div>
            <div class="mc-stats">
              <span>累计充值 ¥{{ fmt(currentCard.totalRecharge) }}</span>
              <span>累计消费 ¥{{ fmt(currentCard.totalConsume) }}</span>
            </div>
            <div class="mc-actions">
              <el-button size="small" type="danger" link @click="detachCard">不使用此卡</el-button>
            </div>
          </div>

          <el-empty v-else description="暂无会员卡，可勾选「收衣同时办卡」" :image-size="70">
            <template #footer>
              <el-button type="primary" link @click="openCreateCard">新办一张会员卡</el-button>
            </template>
          </el-empty>

          <!-- 收衣同时充值开关（只有已有会员卡时才显示） -->
          <div v-if="currentCard" class="new-card-toggle">
            <el-checkbox v-model="form.rechargeFlag" :true-value="1" :false-value="0" @change="onRechargeChange">
              收衣同时充值
            </el-checkbox>

            <div v-if="form.rechargeFlag === 1" class="new-card-options">
              <el-form label-width="80px" size="default">
                <el-form-item label="充值类型" required>
                  <el-select v-model="form.rechargeCardTypeId" placeholder="选择充值类型" style="width: 100%" @change="recalc">
                    <el-option
                      v-for="t in cardTypeList"
                      :key="t.id"
                      :label="`${t.name} · 充 ¥${t.amount}`"
                      :value="t.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="支付方式" required>
                  <el-radio-group v-model="form.rechargePayMethod">
                    <el-radio-button label="CASH">现金</el-radio-button>
                    <el-radio-button label="WECHAT">微信</el-radio-button>
                    <el-radio-button label="ALIPAY">支付宝</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-alert
                  type="success" :closable="false" show-icon size="small"
                  :title="`充值 ¥${rechargeType?.amount || 0} 将计入本次收款，充后余额 ¥${fmt(rechargeBalanceAfter)}`"
                />
              </el-form>
            </div>
          </div>

          <!-- 收衣同时办卡开关（只有无会员卡时才显示） -->
          <div v-if="!currentCard" class="new-card-toggle">
            <el-checkbox v-model="form.newCardFlag" :true-value="1" :false-value="0" @change="onNewCardChange">
              收衣同时办卡
            </el-checkbox>

            <div v-if="form.newCardFlag === 1" class="new-card-options">
              <el-form label-width="80px" size="default">
                <el-form-item label="卡类型" required>
                  <el-select v-model="form.newCardTypeId" placeholder="选择卡类型" style="width: 100%" @change="recalc">
                    <el-option
                      v-for="t in cardTypeList"
                      :key="t.id"
                      :label="`${t.name} · 充 ¥${t.amount} · ${t.discountRate}折`"
                      :value="t.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="支付方式" required>
                  <el-radio-group v-model="form.newCardPayMethod">
                    <el-radio-button label="CASH">现金</el-radio-button>
                    <el-radio-button label="WECHAT">微信</el-radio-button>
                    <el-radio-button label="ALIPAY">支付宝</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-alert
                  type="success" :closable="false" show-icon size="small"
                  :title="`所选卡：¥${newCardType?.amount || 0} 将作为余额到账，折扣 ${newCardType?.discountRate || '—'} 折`"
                />
              </el-form>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Step 2: 衣物明细 ===== -->
      <div v-show="currentStep === 2" class="step-panel step-items">
        <!-- 类别选择 -->
        <div class="card-box category-card">
          <div class="card-title">
            <el-icon :size="18"><Box /></el-icon>
            <span>衣物类别</span>
            <el-input
              v-model="kw"
              size="small"
              clearable
              placeholder="搜索类别（如 衬衫）"
              style="width: 220px"
              :prefix-icon="Search"
              @input="onSearchCategory"
            />
          </div>

          <el-tabs v-model="activeGroup" type="card" class="cat-tabs">
            <el-tab-pane
              v-for="g in groups"
              :key="g.key"
              :label="g.label"
              :name="g.key"
            >
              <div class="cat-grid">
                <div
                  v-for="c in categoriesByGroup[g.key]"
                  :key="c.id"
                  class="cat-cell"
                  :class="{ active: isCatSelected(c.id) }"
                  @click="onAddCategory(c)"
                >
                  <div class="cat-name">{{ c.categoryLevel2 }}</div>
                  <div class="cat-price">
                    <span v-if="c.priceMode === 1">¥{{ fmt(c.originalPrice) }}</span>
                    <span v-else>
                      <span class="orig">¥{{ fmt(c.originalPrice) }}</span>
                      <span class="mp300">300卡 ¥{{ fmt(c.memberPrice300) }}</span>
                      <span class="mp500">500卡 ¥{{ fmt(c.memberPrice500) }}</span>
                    </span>
                  </div>
                </div>
                <div v-if="!categoriesByGroup[g.key]?.length" class="empty-grid">
                  <el-empty description="暂无类别" :image-size="50" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 明细列表 -->
        <div class="card-box items-card">
          <div class="card-title">
            <el-icon :size="18"><List /></el-icon>
            <span>衣物明细</span>
            <span class="count-badge">共 {{ form.items.length }} 件</span>
          </div>

          <el-table :data="form.items" size="default" border stripe class="items-table">
            <el-table-column label="#" width="50" align="center" type="index" />
            <el-table-column label="类别" min-width="150">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ groupLabel(row.categoryGroup) }}</el-tag>
                <span class="cat-name">{{ row.categoryName }}</span>
              </template>
            </el-table-column>
            <el-table-column label="颜色" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.color" size="small" :color="colorHex(row.color)" effect="dark">{{ row.color }}</el-tag>
                <span v-else class="muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="品牌" width="100">
              <template #default="{ row }">
                <span>{{ row.brand || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="尺码" width="70" align="center">
              <template #default="{ row }">
                <span>{{ row.size || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="1" :max="99" size="default" controls-position="right" @change="recalc" />
              </template>
            </el-table-column>
            <el-table-column label="原价" width="120" align="right">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.unitPrice"
                  :min="0" :precision="2" :step="1"
                  size="default" controls-position="right"
                  @change="recalc"
                />
              </template>
            </el-table-column>
            <el-table-column label="会员价" width="100" align="right">
              <template #default="{ row }">
                <span class="member-price">¥{{ fmt(row.memberPrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="小计" width="110" align="right">
              <template #default="{ row }">
                <b class="subtotal">¥{{ fmt(row.subtotal) }}</b>
              </template>
            </el-table-column>
            <el-table-column label="详情" min-width="220">
              <template #default="{ row }">
                <div class="item-desc">
                  <div v-if="row.defect"><el-tag size="small" type="danger">瑕疵:{{ row.defect }}</el-tag></div>
                  <div v-if="row.special"><el-tag size="small" type="warning">特殊:{{ row.special }}</el-tag></div>
                  <div v-if="row.shelfCode"><el-tag size="small" type="info">货架:{{ row.shelfCode }}</el-tag></div>
                  <el-button link size="small" type="primary" @click="editItem(row)">编辑</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center" fixed="right">
              <template #default="{ $index }">
                <el-button type="danger" link :icon="Delete" @click="removeItem($index)" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!form.items.length" description="请从上方类别中点击添加衣物，将弹出颜色/品牌/尺码填写窗口" :image-size="80" />
        </div>
      </div>

      <!-- ===== Step 3: 瑕疵拍照 ===== -->
      <div v-show="currentStep === 3" class="step-panel step-photo">
        <div class="card-box photo-card">
          <div class="card-title">
            <el-icon :size="18"><Camera /></el-icon>
            <span>瑕疵拍照取证</span>
            <el-tag v-if="form.defectPhotos?.length" type="warning" size="small" class="photo-count">
              已拍 {{ form.defectPhotos.length }} 张
            </el-tag>
          </div>

          <!-- 脚踏拍照状态 -->
          <div class="pedal-status" :class="{ active: pedalEnabled }">
            <el-icon :size="14"><VideoCamera /></el-icon>
            <span>脚踏板：{{ pedalEnabled ? '已连接 (键: ' + pedalKeyName + ')' : '未启用' }}</span>
            <el-button link size="small" @click="togglePedal">
              {{ pedalEnabled ? '关闭' : '启用' }}
            </el-button>
          </div>

          <!-- 拍照/上传按钮 -->
          <div class="photo-actions">
            <el-button :icon="Camera" type="primary" size="large" @click="triggerCamera" :loading="photoUploading">
              <input
                ref="cameraInputRef"
                type="file"
                accept="image/*"
                capture="environment"
                style="display:none"
                @change="onPhotoCapture"
              />
              拍照
            </el-button>
            <el-button :icon="UploadFilled" size="large" @click="triggerFileUpload" :disabled="photoUploading">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                style="display:none"
                @change="onPhotoCapture"
              />
              上传
            </el-button>
            <el-button
              v-if="form.defectPhotos?.length"
              :icon="Delete"
              type="danger"
              link
              @click="clearPhotos"
            >
              清空
            </el-button>
          </div>

          <!-- 照片网格：每张照片显示瑕疵类型标签 -->
          <div v-if="form.defectPhotos?.length" class="photo-grid">
            <div
              v-for="(photo, idx) in form.defectPhotos"
              :key="photo.id || idx"
              class="photo-item"
            >
              <img :src="photoUrl(photo)" :alt="`photo-${idx}`" @click="previewPhoto(idx)" />
              <!-- 瑕疵类型标签 -->
              <div class="photo-defect-tag" v-if="photo.defectType">
                <el-tag
                  v-for="t in (photo.defectType || '').split(',').filter(Boolean)"
                  :key="t"
                  size="small"
                  type="danger"
                  effect="dark"
                >{{ t }}</el-tag>
                <span v-if="photo.defectRemark" class="defect-remark">{{ photo.defectRemark }}</span>
              </div>
              <div class="photo-defect-tag empty" v-else>
                <el-button link size="small" type="warning" @click="editDefectType(idx)">点此选瑕疵类型</el-button>
              </div>
              <div class="photo-delete" @click.stop="removePhoto(idx)">
                <el-icon :size="14"><Close /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="photo-empty">
            <el-icon :size="60" color="#c0c4cc"><Picture /></el-icon>
            <div>踩脚踏板或点拍照上传瑕疵照片</div>
            <div class="muted">每张照片需要选择瑕疵类型</div>
          </div>

          <!-- 大图预览 -->
          <el-image-viewer
            v-if="previewVisibleFlag"
            :urlList="previewUrls"
            :initial-index="previewIndex"
            @close="previewVisibleFlag = false"
          />
        </div>
      </div>

      <!-- ===== Step 4: 收款 ===== -->
      <div v-show="currentStep === 4" class="step-panel step-pay">
        <div class="card-box summary-card">
          <div class="card-title">
            <el-icon :size="18"><Money /></el-icon>
            <span>收款汇总</span>
          </div>

          <!-- 加急勾选 -->
          <div class="urgent-toggle">
            <el-checkbox
              v-model="form.urgentFlag"
              :true-value="1"
              :false-value="0"
              @change="recalc"
            >
              <el-icon style="vertical-align: middle"><AlarmClock /></el-icon>
              加急订单（整体加价 20%）
            </el-checkbox>
          </div>

          <div class="summary-block">
            <div class="line"><span>衣物件数</span><b>{{ totals.count }} 件</b></div>
            <div class="line"><span>原价合计</span><span>¥{{ fmt(totals.totalAmount) }}</span></div>
            <div class="line discount" v-if="totals.discountAmount > 0">
              <span>优惠（{{ totals.discountRate }}折）</span>
              <span class="neg">-¥{{ fmt(totals.discountAmount) }}</span>
            </div>
            <div class="line"><span>折扣后金额</span><span>¥{{ fmt(totals.actualAmount) }}</span></div>
            <div class="line urgent" v-if="form.urgentFlag === 1">
              <span>加急加价（20%）</span>
              <span class="pos">+¥{{ fmt(totals.urgentSurcharge) }}</span>
            </div>
            <div class="line highlight">
              <span>洗衣应付</span>
              <b class="big">¥{{ fmt(totals.payableAmount) }}</b>
            </div>
            <div class="line" v-if="form.newCardFlag === 1">
              <span>办卡金额</span>
              <b class="new-card">¥{{ fmt(totals.newCardAmount) }}</b>
            </div>
            <div class="line" v-if="form.rechargeFlag === 1">
              <span>充值金额</span>
              <b class="new-card">¥{{ fmt(totals.rechargeAmount) }}</b>
            </div>
            <div class="line total-line">
              <span>本次应收</span>
              <b class="huge">¥{{ fmt(totals.totalReceivable) }}</b>
            </div>
          </div>

          <el-divider />

          <div class="payment-block">
            <div class="block-title">支付方式</div>

            <!-- 有会员卡：显示"使用会员卡余额支付"开关 -->
            <div v-if="canUseCard" class="card-pay-toggle">
              <el-checkbox v-model="form.useCardPay" size="large" @change="recalc">
                使用会员卡余额支付（余额：¥{{ fmt(cardBalance) }}）
              </el-checkbox>
            </div>

            <!-- 勾选了卡扣：显示卡扣明细 + 余额不足时的补差方式 -->
            <div v-if="canUseCard && form.useCardPay" class="pay-options">
              <div class="card-deduct-box">
                <div class="line" v-if="form.newCardFlag === 1">
                  <span>办卡充值</span>
                  <b class="new-card">¥{{ fmt(totals.newCardAmount) }}</b>
                </div>
                <div class="line" v-else>
                  <span>会员卡余额</span><b>¥{{ fmt(cardBalance) }}</b>
                </div>
                <div class="line" v-if="form.rechargeFlag === 1">
                  <span>追加充值</span>
                  <b class="new-card">¥{{ fmt(totals.rechargeAmount) }}</b>
                </div>
                <div class="line success">
                  <span>卡扣金额</span>
                  <b>-¥{{ fmt(totals.cardDeduct) }}</b>
                </div>
                <div v-if="totals.extraPayment > 0" class="line danger">
                  <span>补差金额</span>
                  <b>¥{{ fmt(totals.extraPayment) }}</b>
                </div>
                <div v-else class="line success">
                  <span>补差金额</span>
                  <b>¥0.00（余额充足）</b>
                </div>
                <div class="line balance-after">
                  <span>支付后卡内余额</span>
                  <b class="pos">¥{{ fmt(cardBalanceAfter) }}</b>
                </div>
                <div class="line danger total-pay">
                  <span>本次需支付</span>
                  <b>¥{{ fmt(totals.totalReceivable) }}</b>
                </div>
              </div>
              <!-- 余额不足时选择补差方式 -->
              <div v-if="totals.extraPayment > 0" class="extra-pay-row">
                <span class="extra-label">补差方式：</span>
                <el-radio-group v-model="form.extraMethod" @change="recalc">
                  <el-radio-button label="CASH">现金</el-radio-button>
                  <el-radio-button label="WECHAT">微信</el-radio-button>
                  <el-radio-button label="ALIPAY">支付宝</el-radio-button>
                </el-radio-group>
              </div>
            </div>

            <!-- 未勾选卡扣 或 无卡：显示普通支付方式 -->
            <div v-else class="pay-options">
              <el-radio-group v-model="form.extraMethod" class="pay-radio" @change="recalc">
                <el-radio-button label="CASH"><el-icon><Money /></el-icon> 现金</el-radio-button>
                <el-radio-button label="WECHAT">微信</el-radio-button>
                <el-radio-button label="ALIPAY">支付宝</el-radio-button>
              </el-radio-group>
              <div class="card-deduct-box no-card">
                <div class="line danger"><span>应付金额</span><b>¥{{ fmt(totals.totalReceivable) }}</b></div>
              </div>
            </div>
          </div>

          <el-divider />

          <div class="paid-block">
            <el-form label-width="80px">
              <el-form-item label="实收金额">
                <el-input-number
                  v-model="form.totalPaid"
                  :min="0" :precision="2" :step="10"
                  size="large" controls-position="right" style="width: 100%"
                  @change="() => { totalPaidManually = true }"
                />
              </el-form-item>
              <el-form-item label="欠款" v-if="totals.debtAmount > 0">
                <el-alert
                  type="warning" show-icon :closable="false"
                  :title="`本次实收少于应收，将记录欠款 ¥${fmt(totals.debtAmount)}`"
                />
              </el-form-item>
              <el-form-item label="整单备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" placeholder="整单备注/客户留言（可选）" />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

    </div>

    <!-- ============= 底部步骤导航 ============= -->
    <div class="step-nav">
      <el-button size="large" :icon="RefreshLeft" @click="resetAll">重置</el-button>
      <div class="nav-right">
        <el-button v-if="currentStep > 0" size="large" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < stepList.length - 1" size="large" type="primary" @click="nextStep">
          下一步 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
        <el-button
          v-if="currentStep === stepList.length - 1"
          size="large" type="success"
          :icon="Check"
          :loading="submitting"
          @click="submitOrder"
        >
          确认收衣
        </el-button>
      </div>
    </div>

    <!-- ========== 类别详情弹窗（颜色+品牌+尺码+备注） ========== -->
    <el-dialog v-model="itemDetailVisible" :title="itemDetailTitle" width="520px" :close-on-click-modal="false">
      <el-form :model="itemDetail" label-width="80px" size="default">
        <el-form-item label="类别">
          <el-tag size="default">{{ itemDetail.categoryName }}</el-tag>
        </el-form-item>
        <el-form-item label="颜色" required>
          <div class="color-palette">
            <div
              v-for="c in colorList"
              :key="c"
              class="color-chip"
              :class="{ active: itemDetail.color === c }"
              :style="{ background: colorHex(c) }"
              @click="itemDetail.color = c"
            >
              <span v-if="isLightColor(c)" class="dark-text">{{ c }}</span>
              <span v-else class="light-text">{{ c }}</span>
            </div>
            <el-input v-model="itemDetail.color" placeholder="其他" size="small" style="width: 100px" />
          </div>
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="itemDetail.brand" placeholder="品牌（如 鸭鸭/波司登，选填）" maxlength="30" />
        </el-form-item>
        <el-form-item v-if="showSizeForGroup(itemDetail.categoryGroup)" label="尺码">
          <el-select v-model="itemDetail.size" placeholder="选择尺码" clearable style="width: 200px">
            <el-option v-for="s in sizeOptionsForGroup(itemDetail.categoryGroup)" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="瑕疵">
          <el-input v-model="itemDetail.defect" placeholder="衣物本身瑕疵备注（选填）" maxlength="50" />
        </el-form-item>
        <el-form-item label="特殊处理">
          <el-input v-model="itemDetail.special" placeholder="特殊处理要求（选填）" maxlength="50" />
        </el-form-item>
        <el-form-item label="货架号">
          <el-input v-model="itemDetail.shelfCode" placeholder="A-01-01（选填）" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDetailVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmItemDetail">确认</el-button>
      </template>
    </el-dialog>

    <!-- ========== 瑕疵类型选择弹窗 ========== -->
    <el-dialog v-model="defectTypeVisible" title="选择瑕疵类型" width="480px" :close-on-click-modal="false">
      <div class="defect-type-dialog">
        <p class="muted" style="margin-top:0">为这张照片选择瑕疵类型（可多选）：</p>
        <div class="defect-type-grid">
          <div
            v-for="t in defectTypeList"
            :key="t"
            class="defect-type-chip"
            :class="{ active: tempDefectTypes.includes(t) }"
            @click="toggleDefectType(t)"
          >
            {{ t }}
          </div>
        </div>
        <el-form label-width="80px" style="margin-top:16px">
          <el-form-item v-if="tempDefectTypes.includes('其他')" label="其他备注">
            <el-input v-model="tempDefectRemark" placeholder="描述其他瑕疵" maxlength="50" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="defectTypeVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDefectType">确认</el-button>
      </template>
    </el-dialog>

    <!-- ========== 办卡弹窗 ========== -->
    <el-dialog v-model="createCardVisible" title="新办会员卡" width="520px" :close-on-click-modal="false">
      <el-form :model="createCardForm" label-width="80px" ref="createCardFormRef" :rules="createCardRules">
        <el-form-item label="客户姓名" prop="customerName">
          <el-input v-model="createCardForm.customerName" placeholder="办卡人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createCardForm.phone" placeholder="办卡人手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="卡类型" prop="cardTypeId">
          <el-select v-model="createCardForm.cardTypeId" placeholder="选择卡类型" style="width: 100%">
            <el-option
              v-for="t in cardTypeList"
              :key="t.id"
              :label="`${t.name} · 充 ¥${t.amount} · 到账 ¥${t.amount} · 折扣 ${t.discountRate} 折`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-radio-group v-model="createCardForm.paymentMethod">
            <el-radio-button label="CASH">现金</el-radio-button>
            <el-radio-button label="WECHAT">微信</el-radio-button>
            <el-radio-button label="ALIPAY">支付宝</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createCardForm.remark" type="textarea" :rows="2" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createCardVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingCard" @click="doCreateCard">确认办卡</el-button>
      </template>
    </el-dialog>

    <!-- ========== 打印预览（收衣凭证）========== -->
    <ReceiptPreview v-model="previewVisible" :data="previewData" @reset="resetAll" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, Search, CreditCard, Plus, Box, List, Delete,
  Money, RefreshLeft, Check, AlarmClock, Camera, UploadFilled,
  Picture, Close, ZoomIn, VideoCamera, ArrowRight
} from '@element-plus/icons-vue'
import { categoryApi, customerApi, memberCardApi, orderApi, photoApi } from '@/api'
import { photoUrl as resolvePhotoUrl } from '@/utils'
import ReceiptPreview from './components/ReceiptPreview.vue'

// ============= 常量/枚举 =============
const GROUPS = [
  { key: 'CLOTHES', label: '衣物类' },
  { key: 'SHOES',   label: '鞋类' },
  { key: 'HOME',    label: '家纺卧室' },
  { key: 'IRON',    label: '单烫类' },
  { key: 'LEATHER', label: '皮衣奢饰品' },
  { key: 'BAG',     label: '包包类' }
]

// 步骤列表
const stepList = [
  { title: '客户信息', icon: User },
  { title: '会员卡',   icon: CreditCard },
  { title: '衣物明细', icon: Box },
  { title: '瑕疵拍照', icon: Camera },
  { title: '收款',     icon: Money }
]
const currentStep = ref(0)
// 已达到的最大步骤（用于步骤条点击回退范围控制）
const maxReachedStep = ref(0)

// 瑕疵类型预设
const defectTypeList = ['污渍', '破损', '褪色', '划痕', '起球', '磨损', '异味', '变形', '其他']

// 颜色色板
const colorList = ['黑', '白', '灰', '红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '花色']

// ============= 基础数据 =============
const kw = ref('')
const activeGroup = ref('CLOTHES')
const allCategories = ref([])
const cardTypeList = ref([])
const customerDetail = ref(null)
const currentCard = ref(null)
const isNewCustomer = ref(false)
const submitting = ref(false)

// 办卡弹窗
const createCardVisible = ref(false)
const createCardFormRef = ref(null)
const creatingCard = ref(false)
const createCardForm = reactive({
  customerId: null, customerName: '', phone: '',
  cardTypeId: null, paymentMethod: 'CASH', remark: ''
})
const createCardRules = {
  customerName: [{ required: true, message: '请输入客户姓名' }],
  phone: [{ required: true, pattern: /^1\d{10}$/, message: '请输入正确的手机号' }],
  cardTypeId: [{ required: true, message: '请选择卡类型' }],
  paymentMethod: [{ required: true, message: '请选择支付方式' }]
}

// ============= 衣物详情弹窗 =============
const itemDetailVisible = ref(false)
const itemDetail = reactive({
  mode: 'add', // add=新增类别时  edit=编辑已有明细
  editId: null, // 编辑时对应 form.items 的 itemTempId
  categoryId: null, categoryGroup: '', categoryName: '',
  color: '', brand: '', size: '', defect: '', special: '', shelfCode: '',
  // 新增时暂存的原始类别信息（用于生成明细行）
  _category: null
})
const itemDetailTitle = computed(() =>
  itemDetail.mode === 'edit' ? `编辑衣物详情 - ${itemDetail.categoryName}` : `添加衣物 - ${itemDetail.categoryName}`
)

// ============= 瑕疵类型弹窗 =============
const defectTypeVisible = ref(false)
const tempDefectTypes = ref([])
const tempDefectRemark = ref('')
const editingPhotoIndex = ref(-1)

// ============= 表单 =============
const custForm = reactive({
  phone: '', name: '', address: '', remark: '', customerId: null
})

const totalPaidManually = ref(false)

const form = reactive({
  customerName: '', customerPhone: '', customerAddress: '', customerRemark: '',
  newCardFlag: 0, newCardTypeId: null, newCardPayMethod: 'CASH',
  rechargeFlag: 0, rechargeCardTypeId: null, rechargePayMethod: 'CASH',
  memberCardId: null,
  urgentFlag: 0,
  defectPhotos: [],
  paymentMethod: 'CASH', extraMethod: 'CASH', useCardPay: true,
  totalPaid: 0,
  remark: '',
  items: []
})

// 打印预览
const previewVisible = ref(false)
const previewData = ref(null)

// 拍照取证
const cameraInputRef = ref(null)
const fileInputRef = ref(null)
const previewVisibleFlag = ref(false)
const previewIndex = ref(0)
const previewUrls = ref([])
const photoUploading = ref(false)

// 脚踏板
const pedalEnabled = ref(false)
const pedalKeyCode = ref(120)
const pedalKeyName = ref('F9')

// ============= 分类 =============
const groups = computed(() => GROUPS)
const categoriesByGroup = computed(() => {
  const m = {}
  GROUPS.forEach(g => { m[g.key] = [] })
  allCategories.value.forEach(c => {
    if (m[c.categoryGroup]) m[c.categoryGroup].push(c)
  })
  return m
})

function groupLabel(key) {
  const g = GROUPS.find(x => x.key === key)
  return g ? g.label : key
}

async function onSearchCategory() {
  if (!kw.value.trim()) {
    allCategories.value = await categoryApi.list()
    return
  }
  allCategories.value = await categoryApi.search(kw.value.trim())
  if (!categoriesByGroup.value[activeGroup.value]?.length) {
    for (const g of GROUPS) {
      if (categoriesByGroup.value[g.key]?.length) {
        activeGroup.value = g.key
        break
      }
    }
  }
}

// ============= 客户 =============
let phoneTimer = null
function onPhoneBlur() {
  if (phoneTimer) clearTimeout(phoneTimer)
  if (/^1\d{10}$/.test(custForm.phone)) {
    phoneTimer = setTimeout(() => onSearchCustomer(), 200)
  }
}

async function onSearchCustomer() {
  const phone = custForm.phone.trim()
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入11位手机号')
    return
  }
  try {
    const data = await customerApi.search(phone)
    if (data && data.id) {
      customerDetail.value = data
      isNewCustomer.value = false
      custForm.customerId = data.id
      custForm.name = data.name
      custForm.address = data.address || ''
      custForm.remark = data.remark || ''
      // 安全读取会员卡（兼容可能的字段缺失）
      const mc = data.memberCard || data.member_card || null
      currentCard.value = mc
      form.memberCardId = currentCard.value ? currentCard.value.id : null
      // 老客户有卡：强制取消办卡选项，改为显示充值
      if (currentCard.value) {
        form.newCardFlag = 0
        form.newCardTypeId = null
        form.newCardPayMethod = 'CASH'
        form.rechargeFlag = 0
        form.rechargeCardTypeId = null
        form.rechargePayMethod = 'CASH'
        form.useCardPay = true
      }
      recalc()
      ElMessage.success('已加载老客户信息')
    } else {
      customerDetail.value = null
      isNewCustomer.value = true
      custForm.customerId = null
      currentCard.value = null
      form.memberCardId = null
      form.newCardFlag = 0
      form.newCardTypeId = null
      form.newCardPayMethod = 'CASH'
      form.rechargeFlag = 0
      form.rechargeCardTypeId = null
      form.rechargePayMethod = 'CASH'
      form.useCardPay = true
      recalc()
      ElMessage.info('该手机号为新客户，请补充姓名后进入下一步')
    }
  } catch (e) {
    customerDetail.value = null
    isNewCustomer.value = true
    custForm.customerId = null
    currentCard.value = null
    form.memberCardId = null
    recalc()
  }
}

// ============= 会员卡 =============
async function loadCardTypes() {
  cardTypeList.value = await memberCardApi.types() || []
}

const newCardType = computed(() =>
  form.newCardTypeId ? cardTypeList.value.find(x => x.id === form.newCardTypeId) : null
)

const rechargeType = computed(() =>
  form.rechargeCardTypeId ? cardTypeList.value.find(x => x.id === form.rechargeCardTypeId) : null
)
const rechargeAmount = computed(() =>
  form.rechargeFlag === 1 && rechargeType.value ? +rechargeType.value.amount : 0
)

function onNewCardChange(val) {
  if (val === 1) {
    if (!custForm.name || !custForm.phone) {
      ElMessage.warning('请先填写客户姓名和手机号再办卡')
      nextTick(() => { form.newCardFlag = 0 })
      return
    }
    if (!form.newCardTypeId && cardTypeList.value[0]) {
      form.newCardTypeId = cardTypeList.value[0].id
    }
    form.useCardPay = true
  } else {
    form.newCardTypeId = null
    form.newCardPayMethod = 'CASH'
  }
  recalc()
}

function onRechargeChange(val) {
  if (val === 1) {
    if (!currentCard.value) {
      ElMessage.warning('需已有会员卡才能充值')
      nextTick(() => { form.rechargeFlag = 0 })
      return
    }
    if (!form.rechargeCardTypeId && cardTypeList.value[0]) {
      form.rechargeCardTypeId = cardTypeList.value[0].id
    }
  } else {
    form.rechargeCardTypeId = null
    form.rechargePayMethod = 'CASH'
  }
  recalc()
}

const canUseCard = computed(() => !!(currentCard.value) || form.newCardFlag === 1)
const cardBalance = computed(() => {
  if (form.newCardFlag === 1 && newCardType.value) return +newCardType.value.amount
  if (currentCard.value) return +(currentCard.value.balance || 0) + rechargeAmount.value
  return 0
})
const rechargeBalanceAfter = computed(() => {
  const base = currentCard.value ? +(currentCard.value.balance || 0) : 0
  return round2(base + rechargeAmount.value)
})
const cardBalanceAfter = computed(() => {
  return Math.max(0, round2(cardBalance.value - _totals.cardDeduct))
})

function detachCard() {
  currentCard.value = null
  form.memberCardId = null
  form.useCardPay = true
  form.rechargeFlag = 0
  form.rechargeCardTypeId = null
  form.rechargePayMethod = 'CASH'
  recalc()
}

function openCreateCard() {
  createCardForm.customerId = custForm.customerId
  createCardForm.customerName = custForm.name || ''
  createCardForm.phone = custForm.phone || ''
  createCardForm.cardTypeId = cardTypeList.value[0]?.id || null
  createCardForm.paymentMethod = 'CASH'
  createCardForm.remark = ''
  createCardVisible.value = true
}

async function doCreateCard() {
  if (!createCardFormRef.value) return
  await createCardFormRef.value.validate(async (valid) => {
    if (!valid) return
    creatingCard.value = true
    try {
      let saved
      if (!custForm.customerId) {
        saved = await customerApi.save({
          name: createCardForm.customerName,
          phone: createCardForm.phone,
          address: custForm.address || '',
          remark: custForm.remark || ''
        })
        custForm.customerId = saved.id
        customerDetail.value = saved
        isNewCustomer.value = false
        custForm.name = saved.name
        custForm.phone = saved.phone
        custForm.address = saved.address || ''
        custForm.remark = saved.remark || ''
      }
      const card = await memberCardApi.create({
        customerId: custForm.customerId,
        cardTypeId: createCardForm.cardTypeId,
        paymentMethod: createCardForm.paymentMethod,
        remark: createCardForm.remark
      })
      currentCard.value = card
      form.memberCardId = card.id
      form.useCardPay = true
      createCardVisible.value = false
      ElMessage.success('办卡成功，卡号 ' + card.cardNo)
      recalc()
    } finally {
      creatingCard.value = false
    }
  })
}

// ============= 衣物 =============
function isCatSelected(id) {
  return form.items.some(x => x.categoryId === id)
}

/** 点击类别：弹出详情填写窗口 */
function onAddCategory(c) {
  itemDetail.mode = 'add'
  itemDetail.editId = null
  itemDetail.categoryId = c.id
  itemDetail.categoryGroup = c.categoryGroup
  itemDetail.categoryName = (c.categoryLevel1 && c.categoryLevel1 !== c.categoryLevel2)
    ? c.categoryLevel1 + '-' + c.categoryLevel2
    : c.categoryLevel2
  itemDetail.color = ''
  itemDetail.brand = ''
  itemDetail.size = ''
  itemDetail.defect = ''
  itemDetail.special = ''
  itemDetail.shelfCode = ''
  itemDetail._category = c
  itemDetailVisible.value = true
}

/** 编辑已有明细 */
function editItem(row) {
  itemDetail.mode = 'edit'
  itemDetail.editId = row.itemTempId
  itemDetail.categoryId = row.categoryId
  itemDetail.categoryGroup = row.categoryGroup
  itemDetail.categoryName = row.categoryName
  itemDetail.color = row.color || ''
  itemDetail.brand = row.brand || ''
  itemDetail.size = row.size || ''
  itemDetail.defect = row.defect || ''
  itemDetail.special = row.special || ''
  itemDetail.shelfCode = row.shelfCode || ''
  itemDetail._category = null
  itemDetailVisible.value = true
}

/** 确认衣物详情：新增或更新 */
function confirmItemDetail() {
  if (!itemDetail.color) {
    ElMessage.warning('请选择颜色')
    return
  }
  if (itemDetail.mode === 'add') {
    const c = itemDetail._category
    const quantity = 1
    const unitPrice = c.originalPrice
    const memberPrice = computeMemberPrice(unitPrice, c)
    const subtotal = +(memberPrice * quantity).toFixed(2)
    form.items.push({
      itemTempId: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      categoryId: c.id,
      categoryGroup: c.categoryGroup,
      categoryName: itemDetail.categoryName,
      quantity, unitPrice, memberPrice, subtotal,
      color: itemDetail.color,
      brand: itemDetail.brand,
      size: itemDetail.size,
      defect: itemDetail.defect,
      special: itemDetail.special,
      shelfCode: itemDetail.shelfCode
    })
    ElMessage.success(`已添加 ${itemDetail.categoryName}`)
  } else {
    const item = form.items.find(x => x.itemTempId === itemDetail.editId)
    if (item) {
      item.color = itemDetail.color
      item.brand = itemDetail.brand
      item.size = itemDetail.size
      item.defect = itemDetail.defect
      item.special = itemDetail.special
      item.shelfCode = itemDetail.shelfCode
      ElMessage.success('已更新')
    }
  }
  itemDetailVisible.value = false
  recalc()
}

function removeItem(idx) {
  form.items.splice(idx, 1)
  recalc()
}

/** 尺码按类别组切换 */
function showSizeForGroup(group) {
  // 家纺/包包不需要尺码
  return group !== 'HOME' && group !== 'BAG'
}
function sizeOptionsForGroup(group) {
  if (group === 'SHOES') {
    return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44']
  }
  // 衣物/皮衣/单烫
  return ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
}

/** 颜色转色块 */
function colorHex(name) {
  const map = {
    '黑': '#303133', '白': '#f5f7fa', '灰': '#909399',
    '红': '#f56c6c', '橙': '#e6a23c', '黄': '#f7d94c',
    '绿': '#67c23a', '蓝': '#409eff', '紫': '#9b59b6',
    '粉': '#ffb6c1', '棕': '#8b4513', '花色': 'linear-gradient(45deg,#f56c6c,#409eff,#67c23a)'
  }
  return map[name] || '#dcdfe6'
}
function isLightColor(name) {
  return ['白', '黄', '粉', '花色'].includes(name)
}

// ============= 瑕疵类型弹窗 =============
function toggleDefectType(t) {
  const i = tempDefectTypes.value.indexOf(t)
  if (i >= 0) tempDefectTypes.value.splice(i, 1)
  else tempDefectTypes.value.push(t)
}

function editDefectType(idx) {
  editingPhotoIndex.value = idx
  const photo = form.defectPhotos[idx]
  tempDefectTypes.value = (photo.defectType || '').split(',').filter(Boolean)
  tempDefectRemark.value = photo.defectRemark || ''
  defectTypeVisible.value = true
}

function confirmDefectType() {
  if (editingPhotoIndex.value >= 0) {
    const photo = form.defectPhotos[editingPhotoIndex.value]
    photo.defectType = tempDefectTypes.value.join(',')
    photo.defectRemark = tempDefectTypes.value.includes('其他') ? tempDefectRemark.value : ''
  }
  defectTypeVisible.value = false
}

// ============= 拍照取证 =============
function triggerCamera() {
  cameraInputRef.value?.click()
}
function triggerFileUpload() {
  fileInputRef.value?.click()
}

function compressImageToBlob(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          const compressed = new File([blob], file.name || 'photo.jpg', { type: 'image/jpeg' })
          resolve(compressed)
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function onPhotoCapture(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  e.target.value = ''
  photoUploading.value = true
  try {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const compressed = await compressImageToBlob(file)
      const result = await photoApi.upload(compressed)
      const newPhoto = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        filename: result.filename,
        url: result.url,
        size: result.size,
        defectType: '',
        defectRemark: ''
      }
      form.defectPhotos.push(newPhoto)
      // 上传后立即弹出瑕疵类型选择
      editDefectType(form.defectPhotos.length - 1)
    }
    ElMessage.success(`已添加 ${files.length} 张照片`)
  } catch (err) {
    console.error('照片上传失败', err)
    ElMessage.error('照片上传失败')
  } finally {
    photoUploading.value = false
  }
}

function photoUrl(photo) {
  if (!photo) return ''
  if (photo.thumbnail && !photo.url) return photo.thumbnail
  return resolvePhotoUrl(photo)
}

async function removePhoto(idx) {
  const photo = form.defectPhotos[idx]
  if (photo?.filename) {
    try { await photoApi.delete(photo.filename) } catch (e) { console.warn('删除照片失败', e) }
  }
  form.defectPhotos.splice(idx, 1)
}

async function clearPhotos() {
  try {
    await ElMessageBox.confirm('确认清空所有瑕疵照片？', '提示', { type: 'warning' })
  } catch { return }
  for (const photo of form.defectPhotos) {
    if (photo?.filename) {
      try { await photoApi.delete(photo.filename) } catch (e) { /* 忽略 */ }
    }
  }
  form.defectPhotos.splice(0)
}

function previewPhoto(idx) {
  previewUrls.value = form.defectPhotos.map(p => photoUrl(p))
  previewIndex.value = idx
  previewVisibleFlag.value = true
}

// ============= 脚踏板 =============
function togglePedal() {
  pedalEnabled.value = !pedalEnabled.value
  if (pedalEnabled.value) {
    ElMessage.success(`脚踏板已启用，踩下 ${pedalKeyName.value} 键即可拍照`)
  } else {
    ElMessage.info('脚踏板已关闭')
  }
}

function onPedalKeyDown(e) {
  if (!pedalEnabled.value) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.keyCode === pedalKeyCode.value) {
    e.preventDefault()
    triggerCamera()
  }
}

function computeMemberPrice(unitPrice, category) {
  let rate = 10
  let hasCard = false
  if (form.newCardFlag === 1 && newCardType.value) {
    rate = +newCardType.value.discountRate
    hasCard = true
  } else if (currentCard.value) {
    rate = +currentCard.value.discountRate
    hasCard = true
  }
  if (!hasCard) return round2(unitPrice)
  if (!category || category.priceMode === 1) {
    return round2(unitPrice * rate / 10)
  }
  if (rate === 8.8) return round2(category.memberPrice300 || unitPrice)
  if (rate === 6.8) return round2(category.memberPrice500 || unitPrice)
  return round2(unitPrice * rate / 10)
}

function recalc() {
  const catMap = {}
  allCategories.value.forEach(c => { catMap[c.id] = c })
  let totalAmount = 0, actualAmount = 0, count = 0
  form.items.forEach(it => {
    it.memberPrice = computeMemberPrice(it.unitPrice, catMap[it.categoryId])
    it.subtotal = round2(it.memberPrice * it.quantity)
    totalAmount = round2(totalAmount + it.unitPrice * it.quantity)
    actualAmount = round2(actualAmount + it.subtotal)
    count += it.quantity || 1
  })

  _totals.count = count
  _totals.totalAmount = totalAmount
  _totals.actualAmount = actualAmount
  if (form.newCardFlag === 1 && newCardType.value) {
    _totals.discountRate = +newCardType.value.discountRate
  } else if (currentCard.value) {
    _totals.discountRate = +currentCard.value.discountRate
  } else {
    _totals.discountRate = 10
  }
  _totals.discountAmount = round2(totalAmount - actualAmount)
  _totals.urgentSurcharge = form.urgentFlag === 1 ? round2(actualAmount * 0.20) : 0
  const payableAmount = round2(actualAmount + _totals.urgentSurcharge)
  _totals.payableAmount = payableAmount
  _totals.newCardAmount = form.newCardFlag === 1 && newCardType.value
    ? +newCardType.value.amount : 0
  _totals.rechargeAmount = rechargeAmount.value

  const cardInflow = _totals.newCardAmount + _totals.rechargeAmount
  if (canUseCard.value && form.useCardPay) {
    _totals.cardDeduct = Math.min(cardBalance.value, payableAmount)
    _totals.extraPayment = round2(payableAmount - _totals.cardDeduct)
    _totals.totalReceivable = round2(cardInflow + _totals.extraPayment)
  } else {
    _totals.cardDeduct = 0
    _totals.extraPayment = payableAmount
    _totals.totalReceivable = round2(payableAmount + cardInflow)
  }

  if (!totalPaidManually.value) {
    form.totalPaid = _totals.totalReceivable
  }
  _totals.debtAmount = Math.max(0, round2(_totals.totalReceivable - (form.totalPaid || 0)))
}

const _totals = reactive({
  count: 0, totalAmount: 0, actualAmount: 0,
  urgentSurcharge: 0, payableAmount: 0,
  discountRate: 10, discountAmount: 0, newCardAmount: 0, rechargeAmount: 0,
  totalReceivable: 0, cardDeduct: 0, extraPayment: 0, debtAmount: 0
})
const totals = computed(() => _totals)

// ============= 步骤导航 =============
/** 各步骤完成条件校验 */
function stepValidate(step) {
  switch (step) {
    case 0: // 客户信息：手机号+姓名
      if (!custForm.phone || !/^1\d{10}$/.test(custForm.phone.trim())) return '请输入正确的11位手机号'
      if (!custForm.name || !custForm.name.trim()) return '请填写客户姓名'
      return null
    case 1: // 会员卡：办卡需选卡类型
      if (form.newCardFlag === 1 && !form.newCardTypeId) return '请选择办卡类型'
      if (form.rechargeFlag === 1 && !form.rechargeCardTypeId) return '请选择充值类型'
      return null
    case 2: // 衣物明细：至少1件
      if (form.items.length === 0) return '请至少添加1件衣物'
      return null
    case 3: // 瑕疵拍照：可选，但已拍照片需选瑕疵类型
      if (form.defectPhotos.length > 0) {
        const noType = form.defectPhotos.find(p => !p.defectType)
        if (noType) return '每张照片都需要选择瑕疵类型'
      }
      return null
    default:
      return null
  }
}

function nextStep() {
  const err = stepValidate(currentStep.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  if (currentStep.value < stepList.length - 1) {
    currentStep.value++
    if (currentStep.value > maxReachedStep.value) {
      maxReachedStep.value = currentStep.value
    }
  }
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

/** 点击步骤条：只能回退到已达到的步骤 */
function onStepClick(i) {
  if (i <= maxReachedStep.value) {
    currentStep.value = i
  }
}

// ============= 提交 =============
function validateSubmit() {
  const err = stepValidate(currentStep.value)
  if (err) return err
  if (form.paymentMethod === 'MIXED' && !form.extraMethod) {
    return '请选择组合支付的补差方式'
  }
  return null
}

async function submitOrder() {
  const err = validateSubmit()
  if (err) {
    ElMessage.warning(err)
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认收衣？应收 ¥${fmt(_totals.totalReceivable)}，实收 ¥${fmt(form.totalPaid)}，共 ${_totals.count} 件`,
      '提交确认', { type: 'warning', confirmButtonText: '确认收衣', cancelButtonText: '再看看' }
    )
  } catch { return }

  submitting.value = true
  try {
    // 关键：只有使用卡扣款时才传 memberCardId
    // 如果有卡但不使用卡扣款，memberCardId 设为 null，后端走普通支付
    const useCardForPay = canUseCard.value && form.useCardPay
    const payload = {
      customerName: custForm.name.trim(),
      customerPhone: custForm.phone.trim(),
      customerAddress: custForm.address || '',
      customerRemark: custForm.remark || '',
      newCardFlag: form.newCardFlag,
      newCardTypeId: form.newCardFlag === 1 ? form.newCardTypeId : null,
      newCardPayMethod: form.newCardFlag === 1 ? form.newCardPayMethod : null,
      rechargeFlag: form.rechargeFlag,
      rechargeCardTypeId: form.rechargeFlag === 1 ? form.rechargeCardTypeId : null,
      rechargePayMethod: form.rechargeFlag === 1 ? form.rechargePayMethod : null,
      // 只有使用卡扣款时才传卡ID；充值时也需要传（后端需要更新卡余额）
      memberCardId: (useCardForPay || form.rechargeFlag === 1) ? form.memberCardId : null,
      urgentFlag: form.urgentFlag,
      paymentMethod: _totals.cardDeduct > 0
        ? (_totals.extraPayment > 0 ? 'MIXED' : 'MEMBER_CARD')
        : (form.extraMethod || 'CASH'),
      extraMethod: _totals.extraPayment > 0
        ? (form.extraMethod || 'CASH')
        : null,
      totalPaid: round2(form.totalPaid || 0),
      remark: form.remark || '',
      defectPhotos: form.defectPhotos.map(p => ({
        id: p.id,
        filename: p.filename,
        url: p.url,
        size: p.size,
        defectType: p.defectType || '',
        defectRemark: p.defectRemark || ''
      })),
      items: form.items.map(it => ({
        categoryId: it.categoryId,
        quantity: it.quantity || 1,
        unitPrice: round2(it.unitPrice),
        color: it.color || '',
        brand: it.brand || '',
        size: it.size || '',
        defect: it.defect || '',
        special: it.special || '',
        shelfCode: it.shelfCode || ''
      }))
    }
    const resp = await orderApi.receive(payload)
    previewData.value = resp
    previewVisible.value = true
    ElMessage.success('收衣成功！订单号 ' + resp.orderNo)
  } finally {
    submitting.value = false
  }
}

// ============= 重置 =============
function resetAll() {
  custForm.phone = ''
  custForm.name = ''
  custForm.address = ''
  custForm.remark = ''
  custForm.customerId = null
  customerDetail.value = null
  currentCard.value = null
  isNewCustomer.value = false
  form.newCardFlag = 0
  form.newCardTypeId = null
  form.newCardPayMethod = 'CASH'
  form.rechargeFlag = 0
  form.rechargeCardTypeId = null
  form.rechargePayMethod = 'CASH'
  form.memberCardId = null
  form.urgentFlag = 0
  form.defectPhotos.splice(0)
  form.paymentMethod = 'CASH'
  form.extraMethod = 'CASH'
  form.totalPaid = 0
  form.remark = ''
  form.items.splice(0)
  totalPaidManually.value = false
  currentStep.value = 0
  maxReachedStep.value = 0
  recalc()
  activeGroup.value = 'CLOTHES'
  kw.value = ''
}

// ============= 工具 =============
function fmt(v) {
  const n = v == null ? 0 : Number(v)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}
function round2(n) { return Math.round(+n * 100) / 100 }

// ============= 生命周期 =============
onMounted(async () => {
  window.addEventListener('keydown', onPedalKeyDown)
  try {
    allCategories.value = await categoryApi.list() || []
    await loadCardTypes()
    recalc()
  } catch (e) {
    console.error(e)
    ElMessage.warning('加载类别/卡类型失败，请检查后端')
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onPedalKeyDown)
})

watch(() => form.totalPaid, recalc)
</script>

<style scoped>
.receive-wrapper {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}

/* 步骤条 */
.steps-bar {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.steps-bar :deep(.el-step) { cursor: not-allowed; }
.steps-bar :deep(.el-step.clickable) { cursor: pointer; }
.steps-bar :deep(.el-step.clickable:hover .el-step__title) { color: #409eff; }

/* 步骤内容区 */
.step-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.step-panel {
  max-width: 1100px;
  margin: 0 auto;
}

.card-box {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  padding: 20px 24px;
  margin-bottom: 12px;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}
.ml-auto { margin-left: auto; }

.phone-item :deep(.el-input-group) { flex-wrap: nowrap; }

.customer-stats {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 10px 12px;
}
.customer-stats b { color: #409EFF; }
.divider { margin: 0 10px; color: #dcdfe6; }

/* 会员卡 */
.mc-box {
  background: linear-gradient(135deg,#fa8c16 0%,#f5222d 100%);
  color: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}
.mc-header { display: flex; justify-content: space-between; }
.mc-no { font-family: monospace; letter-spacing: 1px; font-size: 16px; font-weight: 700; }
.mc-type { margin-top: 6px; display: flex; align-items: center; gap: 8px; }
.mc-rate { font-size: 12px; opacity: 0.9; }
.mc-balance { text-align: right; }
.mc-balance .label { font-size: 12px; opacity: 0.85; }
.mc-balance .value { font-size: 24px; font-weight: 700; margin-top: 2px; }
.mc-stats { margin-top: 12px; font-size: 13px; opacity: 0.92; display: flex; justify-content: space-between; }
.mc-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
.mc-actions .el-button { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #fff; }
.mc-actions .el-button.el-button--text { background: transparent; border: none; }

.new-card-toggle {
  margin-top: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px 14px;
}
.new-card-options { margin-top: 12px; }
.new-card-options .el-form-item { margin-bottom: 10px; }

/* 衣物类别 */
.cat-tabs { margin-top: -4px; }
.cat-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  min-height: 160px;
}
.cat-cell {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all .15s;
  background: #fff;
  text-align: center;
}
.cat-cell:hover { border-color: #409EFF; background: #ecf5ff; transform: translateY(-1px); }
.cat-cell.active { border-color: #409EFF; background: #409EFF; color: #fff; }
.cat-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.cat-price { font-size: 12px; color: #f56c6c; line-height: 1.5; }
.cat-cell.active .cat-price { color: #fff; }
.cat-price .orig { text-decoration: line-through; opacity: 0.7; margin-right: 4px; }
.cat-price .mp300, .cat-price .mp500 { display: block; font-size: 11px; }
.empty-grid { grid-column: span 4; display: flex; justify-content: center; }

.count-badge { margin-left: auto; color: #909399; font-size: 13px; }
.items-table :deep(.el-table__cell) { padding: 6px 8px; }
.cat-name { margin-left: 6px; font-size: 13px; }
.member-price { color: #e6a23c; font-weight: 600; }
.subtotal { color: #409EFF; }
.muted { color: #c0c4cc; font-size: 12px; }
.item-desc { display: flex; flex-direction: column; gap: 4px; }
.item-desc .el-tag { margin-right: 4px; }

/* 汇总 */
.urgent-toggle {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.urgent-toggle :deep(.el-checkbox__label) {
  font-size: 15px;
  font-weight: 600;
  color: #f56c6c;
}
.urgent-toggle :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.summary-block .line {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 2px; font-size: 14px; color: #606266;
}
.summary-block .line.big b { font-size: 20px; }
.summary-block .line.highlight { padding: 12px 4px; border-top: 1px dashed #ebeef5; border-bottom: 1px dashed #ebeef5; margin: 8px 0; }
.summary-block .line.discount .neg { color: #67c23a; }
.summary-block .line.urgent .pos { color: #f56c6c; font-weight: 600; }
.summary-block .line.total-line { padding: 14px 4px; background: linear-gradient(90deg,#ecf5ff 0%,#e1f3d8 100%); border-radius: 6px; margin-top: 8px; }
.summary-block .huge { color: #f56c6c; font-size: 26px; font-weight: 700; }
.summary-block .new-card { color: #e6a23c; }

.block-title { font-weight: 600; color: #303133; margin: 4px 0 12px; font-size: 15px; }
.pay-radio { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 12px; }
.card-deduct-box { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 6px; padding: 12px 14px; margin-top: 8px; }
.card-deduct-box .line { padding: 5px 0; }
.card-deduct-box .line.success b { color: #67c23a; }
.card-deduct-box .line.danger b { color: #f56c6c; font-size: 16px; }
.card-deduct-box .line.total-pay { border-top: 2px solid #e6a23c; margin-top: 8px; padding-top: 10px; font-weight: 600; font-size: 16px; }
.card-deduct-box .line.total-pay b { color: #f56c6c; font-size: 18px; }
.card-deduct-box .line.balance-after { background: #f0f9eb; border-radius: 4px; padding: 8px 10px; margin: 5px 0; }
.card-deduct-box .line.balance-after b { color: #67c23a; font-size: 16px; font-weight: 600; }
.card-deduct-box .new-card { color: #e6a23c; }
.card-pay-toggle { margin-bottom: 12px; }
.card-pay-toggle .el-checkbox { font-size: 15px; }
.card-pay-toggle .el-checkbox__label { font-weight: 600; }
.extra-pay-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.extra-pay-row .extra-label { font-size: 14px; color: #606266; white-space: nowrap; }

.paid-block :deep(.el-input-number) { width: 100%; }

/* 瑕疵拍照 */
.photo-card .photo-count { margin-left: auto; }
.pedal-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  background: #f4f4f5;
  color: #909399;
  margin-bottom: 12px;
}
.pedal-status.active { background: #e8f4ff; color: #409eff; }
.pedal-status .el-button { margin-left: auto; }
.photo-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.photo-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  background: #fff;
}
.photo-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
  cursor: pointer;
}
.photo-defect-tag {
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  background: #f5f7fa;
  min-height: 40px;
}
.photo-defect-tag.empty { justify-content: center; }
.defect-remark {
  font-size: 12px;
  color: #909399;
  width: 100%;
}
.photo-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.55);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s;
}
.photo-item:hover .photo-delete { opacity: 1; }
.photo-delete:hover { background: #f56c6c; }
.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
  font-size: 15px;
  gap: 10px;
}

/* 底部导航 */
.step-nav {
  background: #fff;
  border-radius: 8px;
  padding: 14px 24px;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.nav-right { display: flex; gap: 10px; }

/* 颜色色板 */
.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.color-chip {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all .15s;
}
.color-chip:hover { transform: scale(1.08); }
.color-chip.active { border-color: #409eff; box-shadow: 0 0 8px rgba(64,158,255,0.4); }
.dark-text { color: #303133; }
.light-text { color: #fff; }

/* 瑕疵类型选择 */
.defect-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.defect-type-chip {
  padding: 12px 8px;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all .15s;
  background: #fff;
}
.defect-type-chip:hover { border-color: #f56c6c; color: #f56c6c; }
.defect-type-chip.active { background: #f56c6c; border-color: #f56c6c; color: #fff; }
</style>
