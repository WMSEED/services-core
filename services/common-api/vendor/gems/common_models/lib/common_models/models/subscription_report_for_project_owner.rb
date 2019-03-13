module CommonModels
  class SubscriptionReportForProjectOwner < ActiveRecord::Base
    self.table_name = 'payment_service.subscription_report_for_project_owners'
    belongs_to :project

    scope :project_id, ->(project_id) { where(project_id: project_id) }
    scope :status, ->(status) { where(status: status) }

    def self.to_csv
      attributes = ['Nome completo',	'Nome público', 'CPF', 'Email perfil Catarse',	'Valor do apoio mensal',	'Título da recompensa',	'Descrição da recompensa',	'Total apoiado até hoje', 'Status da Assinatura',	'Meio de pagamento',	'Data de confirmação do último pagamento',	'Data de início da Assinatura',	'Qtde. de apoios confirmados',	'ID do usuário', 'Anônimo', 'Rua', 'Número', 'Complemento', 'Bairro',	'Cidade',	'Estado',	'CEP']
      CSV.generate(headers: true) do |csv|
        csv << attributes

        all.each do |sub|
          csv << [sub.name,
                  sub.public_name,
                  sub.cpf,
                  sub.email,
                  sub.amount,
                  sub.title,
                  sub.description,
                  sub.total_backed,
                  I18n.t('projects.subscription_fields.status.' + sub.status),
                  I18n.t('projects.subscription_fields.' + sub.payment_method),
                  sub.last_paid_at ? I18n.l(sub.last_paid_at.to_date) : '',
                  sub.started_at ? I18n.l(sub.started_at.to_date) : '',
                  I18n.t('datetime.distance_in_words.x_months', count: sub.payments_count),
                  sub.user_id,
                  sub.anonymous,
                  sub.street,
                  sub.number,
                  sub.complement,
                  sub.neighborhood,
                  sub.city,
                  sub.state,
                  sub.zipcode
          ]
        end
      end
    end
  end
end
